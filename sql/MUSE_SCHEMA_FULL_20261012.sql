


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."atomic_like_count"("table_name" "text", "row_id" "uuid", "delta" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  new_count INT;
BEGIN
  IF table_name = 'muse_feed_posts' THEN
    UPDATE muse_feed_posts SET likes = GREATEST(0, likes + delta) WHERE id = row_id RETURNING likes INTO new_count;
  ELSIF table_name = 'muse_moments' THEN
    UPDATE muse_moments SET likes = GREATEST(0, likes + delta) WHERE id = row_id RETURNING likes INTO new_count;
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', table_name;
  END IF;
  RETURN COALESCE(new_count, 0);
END;
$$;


ALTER FUNCTION "public"."atomic_like_count"("table_name" "text", "row_id" "uuid", "delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_claim_founding_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ DECLARE claimed RECORD;
BEGIN
  IF NEW.founding_tier IS NULL THEN
    SELECT ft.founding_tier, ft.pro_expires_at INTO claimed FROM claim_founding_status(NEW.email) ft;
    IF claimed.founding_tier IS NOT NULL THEN
      NEW.founding_tier := claimed.founding_tier; NEW.pro_expires_at := claimed.pro_expires_at; NEW.tier := 'muse_pro';
    END IF;
  END IF; RETURN NEW;
END; $$;


ALTER FUNCTION "public"."auto_claim_founding_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate"("p_key" "text", "p_limit" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_count INT;
BEGIN
  -- Atomic upsert: increment if within the current minute window,
  -- otherwise reset to 1 for a fresh window.
  INSERT INTO muse_rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN 1
          ELSE muse_rate_limits.count + 1
        END,
        window_start = CASE
          WHEN muse_rate_limits.window_start < now() - interval '1 minute'
          THEN now()
          ELSE muse_rate_limits.window_start
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;


ALTER FUNCTION "public"."check_rate"("p_key" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_founding_status"("target_email" "text") RETURNS TABLE("founding_tier" "text", "pro_expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE wl_position INT;
BEGIN
  SELECT wl.pos INTO wl_position FROM (
    SELECT email, row_number() OVER (ORDER BY created_at ASC) AS pos FROM muse_waitlist
  ) wl WHERE lower(wl.email) = lower(target_email) LIMIT 1;
  IF wl_position IS NULL OR wl_position > 1000 THEN RETURN; END IF;
  IF wl_position <= 150 THEN RETURN QUERY SELECT 'founding'::TEXT, NULL::TIMESTAMPTZ;
  ELSE RETURN QUERY SELECT 'early'::TEXT, (now() + interval '6 months')::TIMESTAMPTZ; END IF;
END; $$;


ALTER FUNCTION "public"."claim_founding_status"("target_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_muse_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO muse_activity_log (user_id, action, details)
  VALUES (
    (SELECT id FROM muse_profiles WHERE auth_id = auth.uid()),
    TG_TABLE_NAME || '_' || TG_OP,
    row_to_json(NEW)::jsonb
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_muse_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."muse_can_view_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM muse_albums a
    WHERE a.id = p_album_id
      AND (a.access_level = 'public'
           OR a.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1))
  ) OR EXISTS (
    SELECT 1 FROM muse_album_access ac
    WHERE ac.album_id = p_album_id
      AND ac.viewer_profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1)
  )
$$;


ALTER FUNCTION "public"."muse_can_view_album"("p_album_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."muse_current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1
$$;


ALTER FUNCTION "public"."muse_current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."muse_owns_album"("p_album_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM muse_albums a
    WHERE a.id = p_album_id
      AND a.profile_id = (SELECT id FROM muse_profiles WHERE auth_id = auth.uid() LIMIT 1)
  )
$$;


ALTER FUNCTION "public"."muse_owns_album"("p_album_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_to_ncmec"("p_incident_id" "uuid", "p_report_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE muse_safety_incidents 
  SET ncmec_report_id = p_report_id, 
      status = 'escalated_to_authorities',
      updated_at = now()
  WHERE id = p_incident_id;
END;
$$;


ALTER FUNCTION "public"."report_to_ncmec"("p_incident_id" "uuid", "p_report_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" "text" NOT NULL,
    "form_type" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "ip" "text"
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "actor_id" "uuid",
    "target_id" "uuid",
    "type" "text"
);


ALTER TABLE "public"."muse_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid",
    "query_text" "text" NOT NULL,
    "query_result_summary" "text" DEFAULT ''::"text" NOT NULL,
    "result_row_count" integer DEFAULT 0,
    "tables_accessed" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_ai_docs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_ai_docs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_album_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "viewer_profile_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_album_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_album_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_album_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_album_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "album_id" "uuid" NOT NULL,
    "img_url" "text" NOT NULL,
    "caption" "text" DEFAULT ''::"text",
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_album_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Untitled Album'::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "cover_url" "text" DEFAULT ''::"text",
    "access_level" "text" DEFAULT 'public'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "view_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    CONSTRAINT "muse_albums_access_level_check" CHECK (("access_level" = ANY (ARRAY['public'::"text", 'private'::"text", 'invite'::"text"])))
);


ALTER TABLE "public"."muse_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_booking_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "payer_id" "uuid" NOT NULL,
    "payee_id" "uuid" NOT NULL,
    "stripe_payment_intent" character varying(100),
    "stripe_transfer_id" character varying(100),
    "amount_cents" integer NOT NULL,
    "commission_cents" integer NOT NULL,
    "net_amount_cents" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "amount" integer,
    CONSTRAINT "muse_booking_payments_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('succeeded'::character varying)::"text", ('failed'::character varying)::"text", ('refunded'::character varying)::"text"])))
);


ALTER TABLE "public"."muse_booking_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" DEFAULT ''::"text",
    "user_avatar" "text" DEFAULT ''::"text",
    "host_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text" DEFAULT ''::"text",
    "reschedule_date" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."muse_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_boost_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "amount_cents" integer DEFAULT 0 NOT NULL,
    "stripe_payment_intent" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "granted_at" timestamp with time zone,
    CONSTRAINT "muse_boost_purchases_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'granted'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."muse_boost_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_brief_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brief_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_brief_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_briefs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "budget" "text" DEFAULT ''::"text",
    "category" "text" DEFAULT 'vision'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "urgent" boolean DEFAULT false,
    "nsfw" boolean DEFAULT false,
    "paid" boolean DEFAULT false,
    "rate" "text" DEFAULT ''::"text",
    "applicants" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'open'::"text",
    "type" "text",
    "deadline" "text"
);


ALTER TABLE "public"."muse_briefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_call_recording_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "consented_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consent_version" "text" DEFAULT '2026-09-21'::"text" NOT NULL
);


ALTER TABLE "public"."muse_call_recording_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "caller_id" "uuid" NOT NULL,
    "callee_id" "uuid" NOT NULL,
    "kind" "text" DEFAULT 'video'::"text" NOT NULL,
    "status" "text" DEFAULT 'ringing'::"text" NOT NULL,
    "room" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "answered_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_ms" integer,
    "voicemail_url" "text",
    "voicemail_duration_ms" integer,
    "voicemail_transcript" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recording_egress_id" "text",
    "recording_path" "text",
    "recording_url" "text"
);


ALTER TABLE "public"."muse_calls" OWNER TO "postgres";


COMMENT ON TABLE "public"."muse_calls" IS 'Per-call log: ring/answer/decline/end lifecycle + optional voicemail';



COMMENT ON COLUMN "public"."muse_calls"."status" IS 'ringing | answered | missed | declined | ended | voicemail | failed';



COMMENT ON COLUMN "public"."muse_calls"."recording_egress_id" IS 'LiveKit egress id while a recording is in flight';



COMMENT ON COLUMN "public"."muse_calls"."recording_path" IS 'Object key of the recording in the R2 bucket';



COMMENT ON COLUMN "public"."muse_calls"."recording_url" IS 'Playable URL for the finished recording';



CREATE TABLE IF NOT EXISTS "public"."muse_communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "img" "text" DEFAULT ''::"text",
    "member_count" integer DEFAULT 0,
    "category" "text" DEFAULT 'general'::"text",
    "is_nsfw" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rules" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "is_private" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."muse_communities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_communities"."rules" IS 'Ordered array of {title, body} rule objects shown in the group detail view.';



CREATE TABLE IF NOT EXISTS "public"."muse_community_bans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "banned_by" "uuid",
    "reason" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_community_bans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_community_join_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" DEFAULT ''::"text",
    "user_avatar" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "muse_community_join_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text"])))
);


ALTER TABLE "public"."muse_community_join_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."muse_community_join_requests" IS 'Join request queue for private communities. Admins/moderators approve or deny.';



CREATE TABLE IF NOT EXISTS "public"."muse_community_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" DEFAULT ''::"text",
    "user_avatar" "text" DEFAULT ''::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'member'::"text" NOT NULL
);


ALTER TABLE "public"."muse_community_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_community_members"."role" IS 'Membership role: admin | moderator | member. The community creator is seeded as admin.';



CREATE TABLE IF NOT EXISTS "public"."muse_community_mutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "muted_by" "uuid",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_community_mutes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_content_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "context" "text" NOT NULL,
    "safe" boolean NOT NULL,
    "flagged_categories" "text"[] DEFAULT '{}'::"text"[],
    "confidence" numeric(5,2) DEFAULT 0,
    "should_block" boolean DEFAULT false,
    "should_report" boolean DEFAULT false,
    "details" "jsonb" DEFAULT '[]'::"jsonb",
    "scanned_at" timestamp with time zone DEFAULT "now"(),
    "is_csam" boolean DEFAULT false,
    "scanned" boolean DEFAULT true
);


ALTER TABLE "public"."muse_content_scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_disclosures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "proposer_id" "uuid" NOT NULL,
    "responder_id" "uuid" NOT NULL,
    "compensation_amount" "text" DEFAULT ''::"text" NOT NULL,
    "compensation_timing" "text" DEFAULT ''::"text" NOT NULL,
    "compensation_method" "text" DEFAULT ''::"text" NOT NULL,
    "content_type_nudity" boolean DEFAULT false NOT NULL,
    "content_type_artistic_nude" boolean DEFAULT false NOT NULL,
    "content_type_boudoir" boolean DEFAULT false NOT NULL,
    "content_type_portrait" boolean DEFAULT false NOT NULL,
    "content_type_fashion" boolean DEFAULT false NOT NULL,
    "content_type_editorial" boolean DEFAULT false NOT NULL,
    "content_type_commercial" boolean DEFAULT false NOT NULL,
    "content_type_conceptual" boolean DEFAULT false NOT NULL,
    "content_type_other" boolean DEFAULT false NOT NULL,
    "content_type_other_desc" "text" DEFAULT ''::"text" NOT NULL,
    "boundary_full_nudity" boolean DEFAULT false NOT NULL,
    "boundary_implied_nudity" boolean DEFAULT false NOT NULL,
    "boundary_partials" boolean DEFAULT false NOT NULL,
    "boundary_no_partials" boolean DEFAULT false NOT NULL,
    "boundary_explicit_acts" boolean DEFAULT false NOT NULL,
    "boundary_penetration" boolean DEFAULT false NOT NULL,
    "boundary_no_penetration" boolean DEFAULT false NOT NULL,
    "boundary_touching_self" boolean DEFAULT false NOT NULL,
    "boundary_touching_other" boolean DEFAULT false NOT NULL,
    "boundary_no_touching" boolean DEFAULT false NOT NULL,
    "location_type" "text" DEFAULT ''::"text" NOT NULL,
    "location_address" "text" DEFAULT ''::"text" NOT NULL,
    "location_public" boolean DEFAULT true,
    "others_present" boolean DEFAULT false NOT NULL,
    "others_count" integer DEFAULT 0 NOT NULL,
    "others_desc" "text" DEFAULT ''::"text" NOT NULL,
    "usage_rights" "text" DEFAULT ''::"text" NOT NULL,
    "usage_custom_desc" "text" DEFAULT ''::"text" NOT NULL,
    "edit_approval_required" boolean DEFAULT false NOT NULL,
    "nda_required" boolean DEFAULT false NOT NULL,
    "model_release_required" boolean DEFAULT false NOT NULL,
    "ai_flagged" boolean DEFAULT false NOT NULL,
    "ai_flag_reason" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'pending_proposer'::"text" NOT NULL,
    "blocked_reason" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "proposer_confirmed_at" timestamp with time zone,
    "responder_confirmed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval)
);


ALTER TABLE "public"."muse_disclosures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text",
    "context" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_event_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_event_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "date" "text" DEFAULT ''::"text",
    "location" "text" DEFAULT ''::"text",
    "category" "text" DEFAULT 'General'::"text",
    "img" "text" DEFAULT ''::"text",
    "attendees" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_events_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "props" "jsonb" DEFAULT '{}'::"jsonb",
    "ua" "text" DEFAULT ''::"text",
    "ip" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_events_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_feed_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_feed_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_feed_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "text" "text" DEFAULT ''::"text",
    "img" "text" DEFAULT ''::"text",
    "type" "text" DEFAULT 'text'::"text",
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "liked_by" "uuid"[] DEFAULT '{}'::"uuid"[],
    "reactions" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "media_url" "text",
    "media_type" "text",
    "duration_ms" integer,
    "transcript" "text"
);


ALTER TABLE "public"."muse_feed_posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_feed_posts"."media_url" IS 'Storage URL for a voice/video post (muse-uploads bucket)';



COMMENT ON COLUMN "public"."muse_feed_posts"."media_type" IS 'audio/webm | video/webm (recorded clips)';



COMMENT ON COLUMN "public"."muse_feed_posts"."duration_ms" IS 'Clip length in milliseconds, for the inline player';



COMMENT ON COLUMN "public"."muse_feed_posts"."transcript" IS 'Auto-transcript of a voice post (Whisper)';



CREATE TABLE IF NOT EXISTS "public"."muse_forum_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_forum_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_forum_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "votes" integer DEFAULT 0,
    "category" "text" DEFAULT 'General'::"text",
    "pinned" boolean DEFAULT false,
    "voters" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "locked" boolean DEFAULT false
);


ALTER TABLE "public"."muse_forum_posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_forum_posts"."locked" IS 'When true, no new replies can be added to this post (admin/mod action).';



CREATE TABLE IF NOT EXISTS "public"."muse_forum_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" DEFAULT ''::"text",
    "user_avatar" "text" DEFAULT ''::"text",
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_reply_id" "uuid",
    "depth" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."muse_forum_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_landing_analytics" (
    "date" "date" NOT NULL,
    "signups" integer DEFAULT 0,
    "qr_scans" integer DEFAULT 0,
    "qr_shares" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_landing_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "matched_at" timestamp with time zone DEFAULT "now"(),
    "anchor_type" "text",
    "anchor_value" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_matches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_matches"."anchor_type" IS 'What the like was anchored to: ''prompt'' or ''photo''. Null for a plain like.';



COMMENT ON COLUMN "public"."muse_matches"."anchor_value" IS 'The specific content liked, e.g. the prompt answer text or "Photo #2".';



COMMENT ON COLUMN "public"."muse_matches"."note" IS 'Optional note text sent along with the like.';



CREATE TABLE IF NOT EXISTS "public"."muse_message_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_from" "uuid" NOT NULL,
    "request_to" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message_preview" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "media_url" "text",
    "media_type" "text",
    "duration_ms" integer,
    "transcript" "text",
    CONSTRAINT "muse_message_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."muse_message_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_message_requests"."media_url" IS 'Storage URL for a voice/video intro (muse-uploads bucket)';



COMMENT ON COLUMN "public"."muse_message_requests"."media_type" IS 'audio/webm | video/webm';



COMMENT ON COLUMN "public"."muse_message_requests"."duration_ms" IS 'Clip length in milliseconds';



COMMENT ON COLUMN "public"."muse_message_requests"."transcript" IS 'Auto-transcript of a voice intro (Whisper)';



CREATE TABLE IF NOT EXISTS "public"."muse_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "text" NOT NULL,
    "sender_id" "text" NOT NULL,
    "receiver_id" "text" DEFAULT ''::"text" NOT NULL,
    "text" "text" NOT NULL,
    "img" "text" DEFAULT ''::"text",
    "read" boolean DEFAULT false,
    "client_msg_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "kind" "text" DEFAULT 'text'::"text" NOT NULL,
    "media_url" "text",
    "media_type" "text",
    "duration_ms" integer,
    "transcript" "text"
);


ALTER TABLE "public"."muse_messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_messages"."kind" IS 'text | image | voice | video';



COMMENT ON COLUMN "public"."muse_messages"."media_url" IS 'Storage URL for voice/video notes (muse-uploads bucket)';



COMMENT ON COLUMN "public"."muse_messages"."media_type" IS 'audio/webm | video/webm (recorded clips)';



COMMENT ON COLUMN "public"."muse_messages"."duration_ms" IS 'Clip length in milliseconds, for the inline player';



COMMENT ON COLUMN "public"."muse_messages"."transcript" IS 'Auto-transcript of a voice note (Whisper), for search + accessibility';



CREATE TABLE IF NOT EXISTS "public"."muse_moments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "text" "text" DEFAULT ''::"text",
    "img" "text" DEFAULT ''::"text",
    "type" "text" DEFAULT 'photo'::"text",
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    "media_url" "text",
    "media_type" "text",
    "duration_ms" integer,
    "transcript" "text"
);


ALTER TABLE "public"."muse_moments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_moments"."media_url" IS 'Storage URL for a voice/video moment (muse-uploads bucket)';



COMMENT ON COLUMN "public"."muse_moments"."media_type" IS 'audio/webm | video/webm (recorded clips)';



COMMENT ON COLUMN "public"."muse_moments"."duration_ms" IS 'Clip length in milliseconds, for the inline player';



COMMENT ON COLUMN "public"."muse_moments"."transcript" IS 'Auto-transcript of a voice moment (Whisper)';



CREATE TABLE IF NOT EXISTS "public"."muse_ncmec_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "file_name" "text",
    "context" "text",
    "flagged_categories" "jsonb" DEFAULT '[]'::"jsonb",
    "confidence" numeric DEFAULT 0,
    "report_type" "text" DEFAULT 'child_sexual_abuse_material'::"text",
    "incident_details" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending_submission'::"text",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_ncmec_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "from_id" "uuid",
    "type" "text" DEFAULT 'system'::"text",
    "body" "text" DEFAULT ''::"text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_photo_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_photo_likes" OWNER TO "postgres";


COMMENT ON TABLE "public"."muse_photo_likes" IS 'Global per-image likes keyed by photo URL so the same image shares one count across Discover/portfolio/profile.';



CREATE TABLE IF NOT EXISTS "public"."muse_professionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "img" "text",
    "loc" "text",
    "exp" "text",
    "openings" integer DEFAULT 0,
    "rate" "text",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "looking" "text"[] DEFAULT '{}'::"text"[],
    "nsfw" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_profile_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "embedding_type" "text" DEFAULT 'profile'::"text" NOT NULL,
    "text_source" "text" DEFAULT ''::"text" NOT NULL,
    "embedding" "public"."vector"(768) NOT NULL,
    "model_version" "text" DEFAULT 'nomic-embed-text'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_profile_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "type" "text" DEFAULT 'Creative'::"text",
    "avatar" "text" DEFAULT ''::"text",
    "bio" "text" DEFAULT ''::"text",
    "loc" "text" DEFAULT ''::"text",
    "styles" "text"[] DEFAULT '{}'::"text"[],
    "looking" "text"[] DEFAULT '{}'::"text"[],
    "zodiac" "text" DEFAULT ''::"text",
    "chinese" "text" DEFAULT ''::"text",
    "mbti" "text" DEFAULT ''::"text",
    "life_path" integer DEFAULT 0,
    "socials" "jsonb" DEFAULT '{}'::"jsonb",
    "favorite_songs" "jsonb" DEFAULT '[]'::"jsonb",
    "portfolio" "jsonb" DEFAULT '[]'::"jsonb",
    "show_nsfw" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "tier" "text" DEFAULT 'free'::"text",
    "lat" double precision,
    "long" double precision,
    "city" "text" DEFAULT ''::"text",
    "referral_code" character varying(12),
    "referred_by" "uuid",
    "stripe_connect_id" character varying(100),
    "profile_completion_pct" integer DEFAULT 0,
    "prompt_completed_at" timestamp with time zone,
    "emergency_contact_added" boolean DEFAULT false,
    "suspended" boolean DEFAULT false,
    "suspended_at" timestamp with time zone,
    "age_verified" boolean DEFAULT false,
    "age_verified_at" timestamp with time zone,
    "views_count" integer DEFAULT 0 NOT NULL,
    "audience" "text" DEFAULT 'creative'::"text" NOT NULL,
    "stats" "jsonb" DEFAULT '{"likes": 0, "passes": 0, "superLikes": 0, "messagesSent": 0, "matchesReceived": 0, "bookingsCompleted": 0}'::"jsonb",
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "founding_tier" "text",
    "pro_expires_at" timestamp with time zone,
    "status" "text",
    "photos" "text"[] DEFAULT '{}'::"text"[],
    "is_admin" boolean DEFAULT false,
    "travel_dates" "jsonb" DEFAULT '[]'::"jsonb",
    "availability_status" "text" DEFAULT 'available'::"text",
    "budget_range" "text" DEFAULT ''::"text",
    "travel_destinations" "text"[] DEFAULT '{}'::"text"[],
    "boost_inventory" integer DEFAULT 0 NOT NULL,
    "boost_expires_at" timestamp with time zone,
    "deletion_requested_at" timestamp with time zone,
    "deletion_purge_after" timestamp with time zone,
    "custom_type_pending" boolean DEFAULT false,
    "custom_style_pending" boolean DEFAULT false,
    "birthdate" "date",
    "nsfw" boolean DEFAULT false NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "referrals" integer DEFAULT 0 NOT NULL,
    "collabs" integer DEFAULT 0 NOT NULL,
    "login_streak" integer DEFAULT 0 NOT NULL,
    "last_login_date" "date",
    "stripe_customer_id" "text",
    "embedding" "public"."vector"(768),
    "embedding_model" "text",
    "embedded_at" timestamp with time zone
);


ALTER TABLE "public"."muse_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_profiles"."profile_completion_pct" IS 'Computed profile completion percentage (0-100)';



COMMENT ON COLUMN "public"."muse_profiles"."boost_inventory" IS 'Count of unused boosts the user owns (quest rewards + paid one-off purchases).';



COMMENT ON COLUMN "public"."muse_profiles"."boost_expires_at" IS 'When the user''s currently active boost expires. Null when not boosted.';



CREATE TABLE IF NOT EXISTS "public"."muse_prompt_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text" DEFAULT ''::"text" NOT NULL,
    "prompt_text" "text" NOT NULL,
    "prompt_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "choices" "jsonb" DEFAULT '[]'::"jsonb",
    "display_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_prompt_bank" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_prompt_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prompt_id" "uuid" NOT NULL,
    "response_text" "text" DEFAULT ''::"text" NOT NULL,
    "response_choices" "jsonb" DEFAULT '[]'::"jsonb",
    "embedding" "public"."vector"(768),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_prompt_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_qr_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "referrer" "text",
    "user_agent" "text",
    "ip_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_qr_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quest_tier" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "action_key" "text" NOT NULL,
    "target_count" integer DEFAULT 1 NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_amount" integer DEFAULT 1 NOT NULL,
    "reward_label" "text" NOT NULL,
    "icon" "text" DEFAULT '⭐'::"text" NOT NULL,
    "color" "text" DEFAULT '#FFD700'::"text" NOT NULL,
    "xp_reward" integer DEFAULT 10 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."muse_quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_rate_limits" (
    "key" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."muse_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_referral_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_id" "uuid" NOT NULL,
    "reward_type" character varying(30) NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "amount_cents" integer DEFAULT 0,
    "stripe_subscription_id" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "muse_referral_rewards_reward_type_check" CHECK ((("reward_type")::"text" = ANY (ARRAY[('free_month'::character varying)::"text", ('credit'::character varying)::"text"])))
);


ALTER TABLE "public"."muse_referral_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referral_code" character varying(12) NOT NULL,
    "referee_id" "uuid",
    "referred_email" character varying(255),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "reward_issued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "muse_referrals_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('signed_up'::character varying)::"text", ('subscribed'::character varying)::"text", ('reward_issued'::character varying)::"text"])))
);


ALTER TABLE "public"."muse_referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_refund_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "amount_cents" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolution_note" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    CONSTRAINT "muse_refund_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved_refund'::"text", 'resolved_declined'::"text"])))
);


ALTER TABLE "public"."muse_refund_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."muse_refund_requests" IS 'Buyer refund/dispute requests; resolved by Muse admin against Stripe.';



CREATE TABLE IF NOT EXISTS "public"."muse_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "target_type" "text" DEFAULT 'user'::"text",
    "reason" "text" NOT NULL,
    "details" "text" DEFAULT ''::"text",
    "ai_classification" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "text",
    "resolution_note" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."muse_reports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_reports"."status" IS 'open | actioned | dismissed. Set by admin-resolve-report; reporter sees this via the my-reports endpoint.';



COMMENT ON COLUMN "public"."muse_reports"."resolution_note" IS 'Optional short admin note shown back to the reporter alongside the resolved status.';



CREATE TABLE IF NOT EXISTS "public"."muse_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewee_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "criteria_communication" integer,
    "criteria_reliability" integer,
    "criteria_creative_quality" integer,
    "criteria_professionalism" integer,
    "criteria_safety" integer,
    CONSTRAINT "muse_reviews_criteria_communication_check" CHECK ((("criteria_communication" >= 1) AND ("criteria_communication" <= 5))),
    CONSTRAINT "muse_reviews_criteria_creative_quality_check" CHECK ((("criteria_creative_quality" >= 1) AND ("criteria_creative_quality" <= 5))),
    CONSTRAINT "muse_reviews_criteria_professionalism_check" CHECK ((("criteria_professionalism" >= 1) AND ("criteria_professionalism" <= 5))),
    CONSTRAINT "muse_reviews_criteria_reliability_check" CHECK ((("criteria_reliability" >= 1) AND ("criteria_reliability" <= 5))),
    CONSTRAINT "muse_reviews_criteria_safety_check" CHECK ((("criteria_safety" >= 1) AND ("criteria_safety" <= 5))),
    CONSTRAINT "muse_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."muse_reviews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muse_reviews"."criteria_communication" IS 'Structured criterion: communication (1-5)';



COMMENT ON COLUMN "public"."muse_reviews"."criteria_reliability" IS 'Structured criterion: reliability (1-5)';



COMMENT ON COLUMN "public"."muse_reviews"."criteria_creative_quality" IS 'Structured criterion: creative quality (1-5)';



COMMENT ON COLUMN "public"."muse_reviews"."criteria_professionalism" IS 'Structured criterion: professionalism (1-5)';



COMMENT ON COLUMN "public"."muse_reviews"."criteria_safety" IS 'Structured criterion: safety (1-5)';



CREATE TABLE IF NOT EXISTS "public"."muse_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_safety_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "disclosure_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "checkin_type" "text" DEFAULT 'pre_shoot'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "shared_with_contact" boolean DEFAULT false NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);


ALTER TABLE "public"."muse_safety_checkins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_safety_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "reviewer_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "resolution_notes" "text",
    "ncmec_report_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_safety_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_safety_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emergency_contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "emergency_contact_phone" "text" DEFAULT ''::"text" NOT NULL,
    "emergency_contact_relation" "text" DEFAULT ''::"text" NOT NULL,
    "trusted_friend_name" "text" DEFAULT ''::"text" NOT NULL,
    "trusted_friend_phone" "text" DEFAULT ''::"text" NOT NULL,
    "trusted_friend_email" "text" DEFAULT ''::"text" NOT NULL,
    "auto_share_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_safety_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_safety_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "booking_id" "uuid",
    "disclosure_id" "uuid",
    "recipient_name" "text" DEFAULT ''::"text" NOT NULL,
    "recipient_phone" "text" DEFAULT ''::"text" NOT NULL,
    "recipient_email" "text" DEFAULT ''::"text" NOT NULL,
    "share_method" "text" DEFAULT 'sms'::"text" NOT NULL,
    "shared_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_safety_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_saved_searches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "query" "text" DEFAULT ''::"text" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb",
    "last_notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_saved_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "host_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "type" "text" DEFAULT 'Consultation'::"text",
    "rate" "text" DEFAULT ''::"text",
    "duration" "text" DEFAULT '60 min'::"text",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "date" "text" DEFAULT ''::"text",
    "location" "text" DEFAULT ''::"text",
    "img" "text" DEFAULT ''::"text",
    "available" boolean DEFAULT true,
    "rating" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "time" "text"
);


ALTER TABLE "public"."muse_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_storage_cleanup_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket" "text" NOT NULL,
    "path" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "profile_id" "text",
    "album_id" "text",
    "photo_id" "text",
    "attempts" integer DEFAULT 1 NOT NULL,
    "last_error" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "muse_storage_cleanup_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'done'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."muse_storage_cleanup_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_strikes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "issued_by" "uuid",
    "reason" "text" NOT NULL,
    "details" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" DEFAULT 'standard'::"text" NOT NULL,
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "suspension_ends_at" timestamp with time zone,
    "appeal_status" "text" DEFAULT 'none'::"text",
    "appeal_text" "text" DEFAULT ''::"text" NOT NULL,
    "appeal_resolved_at" timestamp with time zone,
    "appeal_resolved_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_strikes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_stripe_connect" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_account_id" character varying(100) NOT NULL,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "details_submitted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_stripe_connect" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_verification_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "purpose" "text" DEFAULT 'general'::"text",
    "verified_outputs" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."muse_verification_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muse_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "source" "text" DEFAULT 'default'::"text",
    "referred_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "referral_code" "text"
);


ALTER TABLE "public"."muse_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schema_migrations" (
    "filename" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schema_migrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_activity_log"
    ADD CONSTRAINT "muse_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_admin_audit_log"
    ADD CONSTRAINT "muse_admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_ai_docs"
    ADD CONSTRAINT "muse_ai_docs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_ai_docs"
    ADD CONSTRAINT "muse_ai_docs_title_key" UNIQUE ("title");



ALTER TABLE ONLY "public"."muse_album_access"
    ADD CONSTRAINT "muse_album_access_album_id_viewer_profile_id_key" UNIQUE ("album_id", "viewer_profile_id");



ALTER TABLE ONLY "public"."muse_album_access"
    ADD CONSTRAINT "muse_album_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_album_likes"
    ADD CONSTRAINT "muse_album_likes_album_id_user_id_key" UNIQUE ("album_id", "user_id");



ALTER TABLE ONLY "public"."muse_album_likes"
    ADD CONSTRAINT "muse_album_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_album_photos"
    ADD CONSTRAINT "muse_album_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_albums"
    ADD CONSTRAINT "muse_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_blocks"
    ADD CONSTRAINT "muse_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_blocks"
    ADD CONSTRAINT "muse_blocks_user_id_target_id_key" UNIQUE ("user_id", "target_id");



ALTER TABLE ONLY "public"."muse_booking_payments"
    ADD CONSTRAINT "muse_booking_payments_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."muse_booking_payments"
    ADD CONSTRAINT "muse_booking_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_bookings"
    ADD CONSTRAINT "muse_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_bookings"
    ADD CONSTRAINT "muse_bookings_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."muse_boost_purchases"
    ADD CONSTRAINT "muse_boost_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_brief_applications"
    ADD CONSTRAINT "muse_brief_applications_brief_id_user_id_key" UNIQUE ("brief_id", "user_id");



ALTER TABLE ONLY "public"."muse_brief_applications"
    ADD CONSTRAINT "muse_brief_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_briefs"
    ADD CONSTRAINT "muse_briefs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_call_recording_consents"
    ADD CONSTRAINT "muse_call_recording_consents_call_id_user_id_key" UNIQUE ("call_id", "user_id");



ALTER TABLE ONLY "public"."muse_call_recording_consents"
    ADD CONSTRAINT "muse_call_recording_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_calls"
    ADD CONSTRAINT "muse_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_communities"
    ADD CONSTRAINT "muse_communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_community_bans"
    ADD CONSTRAINT "muse_community_bans_community_id_user_id_key" UNIQUE ("community_id", "user_id");



ALTER TABLE ONLY "public"."muse_community_bans"
    ADD CONSTRAINT "muse_community_bans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_community_join_requests"
    ADD CONSTRAINT "muse_community_join_requests_community_id_user_id_key" UNIQUE ("community_id", "user_id");



ALTER TABLE ONLY "public"."muse_community_join_requests"
    ADD CONSTRAINT "muse_community_join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_community_members"
    ADD CONSTRAINT "muse_community_members_community_id_user_id_key" UNIQUE ("community_id", "user_id");



ALTER TABLE ONLY "public"."muse_community_members"
    ADD CONSTRAINT "muse_community_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_community_mutes"
    ADD CONSTRAINT "muse_community_mutes_community_id_user_id_key" UNIQUE ("community_id", "user_id");



ALTER TABLE ONLY "public"."muse_community_mutes"
    ADD CONSTRAINT "muse_community_mutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_connections"
    ADD CONSTRAINT "muse_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_connections"
    ADD CONSTRAINT "muse_connections_user_id_target_id_key" UNIQUE ("user_id", "target_id");



ALTER TABLE ONLY "public"."muse_content_scans"
    ADD CONSTRAINT "muse_content_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_disclosures"
    ADD CONSTRAINT "muse_disclosures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_error_logs"
    ADD CONSTRAINT "muse_error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_event_rsvps"
    ADD CONSTRAINT "muse_event_rsvps_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."muse_event_rsvps"
    ADD CONSTRAINT "muse_event_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_events_log"
    ADD CONSTRAINT "muse_events_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_events"
    ADD CONSTRAINT "muse_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_feed_comments"
    ADD CONSTRAINT "muse_feed_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_feed_posts"
    ADD CONSTRAINT "muse_feed_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_forum_comments"
    ADD CONSTRAINT "muse_forum_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_forum_posts"
    ADD CONSTRAINT "muse_forum_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_forum_replies"
    ADD CONSTRAINT "muse_forum_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_landing_analytics"
    ADD CONSTRAINT "muse_landing_analytics_pkey" PRIMARY KEY ("date");



ALTER TABLE ONLY "public"."muse_matches"
    ADD CONSTRAINT "muse_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_matches"
    ADD CONSTRAINT "muse_matches_user_id_target_id_key" UNIQUE ("user_id", "target_id");



ALTER TABLE ONLY "public"."muse_message_requests"
    ADD CONSTRAINT "muse_message_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_message_requests"
    ADD CONSTRAINT "muse_message_requests_request_from_request_to_key" UNIQUE ("request_from", "request_to");



ALTER TABLE ONLY "public"."muse_messages"
    ADD CONSTRAINT "muse_messages_client_msg_id_key" UNIQUE ("client_msg_id");



ALTER TABLE ONLY "public"."muse_messages"
    ADD CONSTRAINT "muse_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_moments"
    ADD CONSTRAINT "muse_moments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_ncmec_reports"
    ADD CONSTRAINT "muse_ncmec_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_notifications"
    ADD CONSTRAINT "muse_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_photo_likes"
    ADD CONSTRAINT "muse_photo_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_photo_likes"
    ADD CONSTRAINT "muse_photo_likes_user_id_photo_url_key" UNIQUE ("user_id", "photo_url");



ALTER TABLE ONLY "public"."muse_professionals"
    ADD CONSTRAINT "muse_professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_professionals"
    ADD CONSTRAINT "muse_professionals_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."muse_profile_embeddings"
    ADD CONSTRAINT "muse_profile_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_profile_embeddings"
    ADD CONSTRAINT "muse_profile_embeddings_user_id_embedding_type_key" UNIQUE ("user_id", "embedding_type");



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."muse_prompt_bank"
    ADD CONSTRAINT "muse_prompt_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_prompt_responses"
    ADD CONSTRAINT "muse_prompt_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_prompt_responses"
    ADD CONSTRAINT "muse_prompt_responses_user_id_prompt_id_key" UNIQUE ("user_id", "prompt_id");



ALTER TABLE ONLY "public"."muse_push_subscriptions"
    ADD CONSTRAINT "muse_push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_qr_events"
    ADD CONSTRAINT "muse_qr_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_quests"
    ADD CONSTRAINT "muse_quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_rate_limits"
    ADD CONSTRAINT "muse_rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."muse_referral_rewards"
    ADD CONSTRAINT "muse_referral_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_referrals"
    ADD CONSTRAINT "muse_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_referrals"
    ADD CONSTRAINT "muse_referrals_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."muse_refund_requests"
    ADD CONSTRAINT "muse_refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_reports"
    ADD CONSTRAINT "muse_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_reviews"
    ADD CONSTRAINT "muse_reviews_booking_id_reviewer_id_key" UNIQUE ("booking_id", "reviewer_id");



ALTER TABLE ONLY "public"."muse_reviews"
    ADD CONSTRAINT "muse_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_rsvps"
    ADD CONSTRAINT "muse_rsvps_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."muse_rsvps"
    ADD CONSTRAINT "muse_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_safety_checkins"
    ADD CONSTRAINT "muse_safety_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_safety_checkins"
    ADD CONSTRAINT "muse_safety_checkins_user_booking_key" UNIQUE ("user_id", "booking_id");



ALTER TABLE ONLY "public"."muse_safety_incidents"
    ADD CONSTRAINT "muse_safety_incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_safety_profiles"
    ADD CONSTRAINT "muse_safety_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_safety_profiles"
    ADD CONSTRAINT "muse_safety_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."muse_safety_shares"
    ADD CONSTRAINT "muse_safety_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_saved_searches"
    ADD CONSTRAINT "muse_saved_searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_sessions"
    ADD CONSTRAINT "muse_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_storage_cleanup_jobs"
    ADD CONSTRAINT "muse_storage_cleanup_jobs_bucket_path_key" UNIQUE ("bucket", "path");



ALTER TABLE ONLY "public"."muse_storage_cleanup_jobs"
    ADD CONSTRAINT "muse_storage_cleanup_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_strikes"
    ADD CONSTRAINT "muse_strikes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_stripe_connect"
    ADD CONSTRAINT "muse_stripe_connect_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_stripe_connect"
    ADD CONSTRAINT "muse_stripe_connect_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."muse_verification_sessions"
    ADD CONSTRAINT "muse_verification_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muse_verification_sessions"
    ADD CONSTRAINT "muse_verification_sessions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."muse_waitlist"
    ADD CONSTRAINT "muse_waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."muse_waitlist"
    ADD CONSTRAINT "muse_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("filename");



CREATE INDEX "idx_boost_purchases_user" ON "public"."muse_boost_purchases" USING "btree" ("user_id", "status");



CREATE INDEX "idx_community_bans_community" ON "public"."muse_community_bans" USING "btree" ("community_id");



CREATE INDEX "idx_community_mutes_community" ON "public"."muse_community_mutes" USING "btree" ("community_id");



CREATE INDEX "idx_form_submissions_date" ON "public"."form_submissions" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_form_submissions_type" ON "public"."form_submissions" USING "btree" ("form_type");



CREATE INDEX "idx_forum_replies_parent" ON "public"."muse_forum_replies" USING "btree" ("parent_reply_id", "created_at") WHERE ("parent_reply_id" IS NOT NULL);



CREATE INDEX "idx_forum_replies_post_depth" ON "public"."muse_forum_replies" USING "btree" ("post_id", "depth", "created_at");



CREATE INDEX "idx_join_requests_community" ON "public"."muse_community_join_requests" USING "btree" ("community_id", "status");



CREATE INDEX "idx_join_requests_user" ON "public"."muse_community_join_requests" USING "btree" ("user_id");



CREATE INDEX "idx_msg_requests_status" ON "public"."muse_message_requests" USING "btree" ("status");



CREATE INDEX "idx_msg_requests_to" ON "public"."muse_message_requests" USING "btree" ("request_to");



CREATE INDEX "idx_muse_activity_action" ON "public"."muse_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_activity_user" ON "public"."muse_activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_muse_admin_audit_admin" ON "public"."muse_admin_audit_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_muse_admin_audit_created" ON "public"."muse_admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_ai_docs_section" ON "public"."muse_ai_docs" USING "btree" ("section");



CREATE INDEX "idx_muse_album_access_album" ON "public"."muse_album_access" USING "btree" ("album_id");



CREATE INDEX "idx_muse_album_access_viewer" ON "public"."muse_album_access" USING "btree" ("viewer_profile_id");



CREATE INDEX "idx_muse_album_likes_user_id" ON "public"."muse_album_likes" USING "btree" ("user_id");



CREATE INDEX "idx_muse_album_photos_album" ON "public"."muse_album_photos" USING "btree" ("album_id");



CREATE INDEX "idx_muse_albums_access" ON "public"."muse_albums" USING "btree" ("access_level");



CREATE INDEX "idx_muse_albums_profile" ON "public"."muse_albums" USING "btree" ("profile_id");



CREATE INDEX "idx_muse_blocks_target" ON "public"."muse_blocks" USING "btree" ("target_id");



CREATE INDEX "idx_muse_blocks_user" ON "public"."muse_blocks" USING "btree" ("user_id");



CREATE INDEX "idx_muse_booking_payments_payee_id" ON "public"."muse_booking_payments" USING "btree" ("payee_id");



CREATE INDEX "idx_muse_booking_payments_payer_id" ON "public"."muse_booking_payments" USING "btree" ("payer_id");



CREATE INDEX "idx_muse_bookings_host_id" ON "public"."muse_bookings" USING "btree" ("host_id");



CREATE INDEX "idx_muse_bookings_session" ON "public"."muse_bookings" USING "btree" ("session_id");



CREATE INDEX "idx_muse_bookings_user" ON "public"."muse_bookings" USING "btree" ("user_id");



CREATE INDEX "idx_muse_brief_applications_user_id" ON "public"."muse_brief_applications" USING "btree" ("user_id");



CREATE INDEX "idx_muse_briefs_author" ON "public"."muse_briefs" USING "btree" ("author_id");



CREATE INDEX "idx_muse_call_recording_consents_user_id" ON "public"."muse_call_recording_consents" USING "btree" ("user_id");



CREATE INDEX "idx_muse_calls_callee" ON "public"."muse_calls" USING "btree" ("callee_id", "created_at" DESC);



CREATE INDEX "idx_muse_calls_caller" ON "public"."muse_calls" USING "btree" ("caller_id", "created_at" DESC);



CREATE INDEX "idx_muse_checkins_booking" ON "public"."muse_safety_checkins" USING "btree" ("booking_id");



CREATE INDEX "idx_muse_checkins_status" ON "public"."muse_safety_checkins" USING "btree" ("status");



CREATE INDEX "idx_muse_checkins_user" ON "public"."muse_safety_checkins" USING "btree" ("user_id");



CREATE INDEX "idx_muse_communities_created_by" ON "public"."muse_communities" USING "btree" ("created_by");



CREATE INDEX "idx_muse_communities_member" ON "public"."muse_communities" USING "btree" ("member_count" DESC);



CREATE INDEX "idx_muse_community_bans_banned_by" ON "public"."muse_community_bans" USING "btree" ("banned_by");



CREATE INDEX "idx_muse_community_bans_user_id" ON "public"."muse_community_bans" USING "btree" ("user_id");



CREATE INDEX "idx_muse_community_join_requests_reviewed_by" ON "public"."muse_community_join_requests" USING "btree" ("reviewed_by");



CREATE INDEX "idx_muse_community_members_user" ON "public"."muse_community_members" USING "btree" ("user_id");



CREATE INDEX "idx_muse_community_mutes_muted_by" ON "public"."muse_community_mutes" USING "btree" ("muted_by");



CREATE INDEX "idx_muse_community_mutes_user_id" ON "public"."muse_community_mutes" USING "btree" ("user_id");



CREATE INDEX "idx_muse_connections_target" ON "public"."muse_connections" USING "btree" ("target_id");



CREATE INDEX "idx_muse_connections_user" ON "public"."muse_connections" USING "btree" ("user_id");



CREATE INDEX "idx_muse_content_scans_booking" ON "public"."muse_content_scans" USING "btree" ("booking_id");



CREATE INDEX "idx_muse_content_scans_safe" ON "public"."muse_content_scans" USING "btree" ("safe");



CREATE INDEX "idx_muse_content_scans_scanned" ON "public"."muse_content_scans" USING "btree" ("scanned_at" DESC);



CREATE INDEX "idx_muse_content_scans_user" ON "public"."muse_content_scans" USING "btree" ("user_id");



CREATE INDEX "idx_muse_disclosures_booking" ON "public"."muse_disclosures" USING "btree" ("booking_id");



CREATE INDEX "idx_muse_disclosures_proposer" ON "public"."muse_disclosures" USING "btree" ("proposer_id");



CREATE INDEX "idx_muse_disclosures_responder" ON "public"."muse_disclosures" USING "btree" ("responder_id");



CREATE INDEX "idx_muse_disclosures_status" ON "public"."muse_disclosures" USING "btree" ("status");



CREATE INDEX "idx_muse_embeddings_user" ON "public"."muse_profile_embeddings" USING "btree" ("user_id");



CREATE INDEX "idx_muse_event_rsvps_user_id" ON "public"."muse_event_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_muse_events_log_created" ON "public"."muse_events_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_events_log_name" ON "public"."muse_events_log" USING "btree" ("name");



CREATE INDEX "idx_muse_feed_comments_author_id" ON "public"."muse_feed_comments" USING "btree" ("author_id");



CREATE INDEX "idx_muse_feed_comments_post_id" ON "public"."muse_feed_comments" USING "btree" ("post_id");



CREATE INDEX "idx_muse_feed_posts_author" ON "public"."muse_feed_posts" USING "btree" ("author_id");



CREATE INDEX "idx_muse_forum_comments_author_id" ON "public"."muse_forum_comments" USING "btree" ("author_id");



CREATE INDEX "idx_muse_forum_comments_post_id" ON "public"."muse_forum_comments" USING "btree" ("post_id");



CREATE INDEX "idx_muse_forum_posts_author_id" ON "public"."muse_forum_posts" USING "btree" ("author_id");



CREATE INDEX "idx_muse_forum_posts_created" ON "public"."muse_forum_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_forum_replies_post" ON "public"."muse_forum_replies" USING "btree" ("post_id");



CREATE INDEX "idx_muse_forum_replies_user_id" ON "public"."muse_forum_replies" USING "btree" ("user_id");



CREATE INDEX "idx_muse_matches_target_id" ON "public"."muse_matches" USING "btree" ("target_id");



CREATE INDEX "idx_muse_matches_user" ON "public"."muse_matches" USING "btree" ("user_id");



CREATE INDEX "idx_muse_messages_match" ON "public"."muse_messages" USING "btree" ("match_id");



CREATE INDEX "idx_muse_moments_author_id" ON "public"."muse_moments" USING "btree" ("author_id");



CREATE INDEX "idx_muse_moments_created" ON "public"."muse_moments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_notifications_from_id" ON "public"."muse_notifications" USING "btree" ("from_id");



CREATE INDEX "idx_muse_notifications_user" ON "public"."muse_notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_muse_professionals_type" ON "public"."muse_professionals" USING "btree" ("type");



CREATE INDEX "idx_muse_profiles_location" ON "public"."muse_profiles" USING "btree" ("lat", "long");



CREATE INDEX "idx_muse_profiles_referral_code" ON "public"."muse_profiles" USING "btree" ("referral_code");



CREATE INDEX "idx_muse_profiles_referred_by" ON "public"."muse_profiles" USING "btree" ("referred_by");



CREATE INDEX "idx_muse_prompt_resp_user" ON "public"."muse_prompt_responses" USING "btree" ("user_id");



CREATE INDEX "idx_muse_prompt_responses_prompt_id" ON "public"."muse_prompt_responses" USING "btree" ("prompt_id");



CREATE INDEX "idx_muse_prompts_category" ON "public"."muse_prompt_bank" USING "btree" ("category", "display_order");



CREATE INDEX "idx_muse_push_user" ON "public"."muse_push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_muse_qr_events_created" ON "public"."muse_qr_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_qr_events_source" ON "public"."muse_qr_events" USING "btree" ("source");



CREATE INDEX "idx_muse_qr_events_type" ON "public"."muse_qr_events" USING "btree" ("event_type");



CREATE INDEX "idx_muse_rate_limits_window" ON "public"."muse_rate_limits" USING "btree" ("window_start");



CREATE INDEX "idx_muse_referral_rewards_recipient_id" ON "public"."muse_referral_rewards" USING "btree" ("recipient_id");



CREATE INDEX "idx_muse_referral_rewards_referral_id" ON "public"."muse_referral_rewards" USING "btree" ("referral_id");



CREATE INDEX "idx_muse_referrals_code" ON "public"."muse_referrals" USING "btree" ("referral_code");



CREATE INDEX "idx_muse_referrals_referee_id" ON "public"."muse_referrals" USING "btree" ("referee_id");



CREATE INDEX "idx_muse_referrals_referrer" ON "public"."muse_referrals" USING "btree" ("referrer_id");



CREATE INDEX "idx_muse_refund_requests_resolved_by" ON "public"."muse_refund_requests" USING "btree" ("resolved_by");



CREATE INDEX "idx_muse_reports_target" ON "public"."muse_reports" USING "btree" ("target_id");



CREATE INDEX "idx_muse_reviews_reviewee" ON "public"."muse_reviews" USING "btree" ("reviewee_id");



CREATE INDEX "idx_muse_reviews_reviewer_id" ON "public"."muse_reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_muse_rsvps_event" ON "public"."muse_rsvps" USING "btree" ("event_id");



CREATE INDEX "idx_muse_rsvps_user" ON "public"."muse_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_muse_safety_checkins_disclosure_id" ON "public"."muse_safety_checkins" USING "btree" ("disclosure_id");



CREATE INDEX "idx_muse_safety_incidents_created" ON "public"."muse_safety_incidents" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_safety_incidents_reviewer_id" ON "public"."muse_safety_incidents" USING "btree" ("reviewer_id");



CREATE INDEX "idx_muse_safety_incidents_severity" ON "public"."muse_safety_incidents" USING "btree" ("severity");



CREATE INDEX "idx_muse_safety_incidents_status" ON "public"."muse_safety_incidents" USING "btree" ("status");



CREATE INDEX "idx_muse_safety_incidents_type" ON "public"."muse_safety_incidents" USING "btree" ("type");



CREATE INDEX "idx_muse_safety_incidents_user" ON "public"."muse_safety_incidents" USING "btree" ("user_id");



CREATE INDEX "idx_muse_safety_shares_booking_id" ON "public"."muse_safety_shares" USING "btree" ("booking_id");



CREATE INDEX "idx_muse_safety_shares_disclosure_id" ON "public"."muse_safety_shares" USING "btree" ("disclosure_id");



CREATE INDEX "idx_muse_safety_shares_user_id" ON "public"."muse_safety_shares" USING "btree" ("user_id");



CREATE INDEX "idx_muse_sessions_date" ON "public"."muse_sessions" USING "btree" ("date");



CREATE INDEX "idx_muse_sessions_host" ON "public"."muse_sessions" USING "btree" ("host_id");



CREATE INDEX "idx_muse_strikes_appeal_resolved_by" ON "public"."muse_strikes" USING "btree" ("appeal_resolved_by");



CREATE INDEX "idx_muse_strikes_category" ON "public"."muse_strikes" USING "btree" ("category");



CREATE INDEX "idx_muse_strikes_issued_by" ON "public"."muse_strikes" USING "btree" ("issued_by");



CREATE INDEX "idx_muse_strikes_severity" ON "public"."muse_strikes" USING "btree" ("severity");



CREATE INDEX "idx_muse_strikes_user" ON "public"."muse_strikes" USING "btree" ("user_id");



CREATE INDEX "idx_muse_verification_sessions_stripe" ON "public"."muse_verification_sessions" USING "btree" ("stripe_session_id");



CREATE INDEX "idx_muse_verification_sessions_user" ON "public"."muse_verification_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_muse_waitlist_created" ON "public"."muse_waitlist" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_muse_waitlist_email" ON "public"."muse_waitlist" USING "btree" ("email");



CREATE INDEX "idx_muse_waitlist_referred_by" ON "public"."muse_waitlist" USING "btree" ("referred_by") WHERE ("referred_by" IS NOT NULL);



CREATE INDEX "idx_muse_waitlist_source" ON "public"."muse_waitlist" USING "btree" ("source");



CREATE INDEX "idx_photo_likes_url" ON "public"."muse_photo_likes" USING "btree" ("photo_url");



CREATE INDEX "idx_profiles_availability" ON "public"."muse_profiles" USING "btree" ("availability_status") WHERE ("availability_status" <> 'unavailable'::"text");



CREATE INDEX "idx_profiles_travel_dest" ON "public"."muse_profiles" USING "gin" ("travel_destinations");



CREATE INDEX "idx_refund_requests_booking" ON "public"."muse_refund_requests" USING "btree" ("booking_id", "status");



CREATE INDEX "idx_refund_requests_user" ON "public"."muse_refund_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_saved_searches_user" ON "public"."muse_saved_searches" USING "btree" ("user_id");



CREATE INDEX "muse_feed_posts_created_at" ON "public"."muse_feed_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "muse_profiles_deletion_purge_after_idx" ON "public"."muse_profiles" USING "btree" ("deletion_purge_after") WHERE ("deletion_requested_at" IS NOT NULL);



CREATE INDEX "muse_storage_cleanup_jobs_due_idx" ON "public"."muse_storage_cleanup_jobs" USING "btree" ("status", "next_attempt_at", "updated_at");



CREATE INDEX "muse_storage_cleanup_jobs_status_idx" ON "public"."muse_storage_cleanup_jobs" USING "btree" ("status", "updated_at");



CREATE UNIQUE INDEX "muse_waitlist_referral_code_key" ON "public"."muse_waitlist" USING "btree" ("referral_code") WHERE ("referral_code" IS NOT NULL);



CREATE UNIQUE INDEX "uq_muse_push_endpoint" ON "public"."muse_push_subscriptions" USING "btree" ("endpoint");



CREATE UNIQUE INDEX "uq_quests_key_freq_target" ON "public"."muse_quests" USING "btree" ("action_key", "frequency", "target_count");



CREATE OR REPLACE TRIGGER "trg_auto_claim_founding" BEFORE INSERT ON "public"."muse_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_claim_founding_trigger"();



ALTER TABLE ONLY "public"."muse_activity_log"
    ADD CONSTRAINT "muse_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_admin_audit_log"
    ADD CONSTRAINT "muse_admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_album_access"
    ADD CONSTRAINT "muse_album_access_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."muse_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_album_access"
    ADD CONSTRAINT "muse_album_access_viewer_profile_id_fkey" FOREIGN KEY ("viewer_profile_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_album_likes"
    ADD CONSTRAINT "muse_album_likes_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."muse_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_album_likes"
    ADD CONSTRAINT "muse_album_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_album_photos"
    ADD CONSTRAINT "muse_album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."muse_albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_albums"
    ADD CONSTRAINT "muse_albums_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_booking_payments"
    ADD CONSTRAINT "muse_booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_booking_payments"
    ADD CONSTRAINT "muse_booking_payments_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_booking_payments"
    ADD CONSTRAINT "muse_booking_payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_bookings"
    ADD CONSTRAINT "muse_bookings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_bookings"
    ADD CONSTRAINT "muse_bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."muse_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_bookings"
    ADD CONSTRAINT "muse_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_boost_purchases"
    ADD CONSTRAINT "muse_boost_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_brief_applications"
    ADD CONSTRAINT "muse_brief_applications_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "public"."muse_briefs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_brief_applications"
    ADD CONSTRAINT "muse_brief_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_briefs"
    ADD CONSTRAINT "muse_briefs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_call_recording_consents"
    ADD CONSTRAINT "muse_call_recording_consents_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "public"."muse_calls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_call_recording_consents"
    ADD CONSTRAINT "muse_call_recording_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_communities"
    ADD CONSTRAINT "muse_communities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_community_bans"
    ADD CONSTRAINT "muse_community_bans_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_community_bans"
    ADD CONSTRAINT "muse_community_bans_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."muse_communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_bans"
    ADD CONSTRAINT "muse_community_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_join_requests"
    ADD CONSTRAINT "muse_community_join_requests_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."muse_communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_join_requests"
    ADD CONSTRAINT "muse_community_join_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_community_join_requests"
    ADD CONSTRAINT "muse_community_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_members"
    ADD CONSTRAINT "muse_community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."muse_communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_members"
    ADD CONSTRAINT "muse_community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_mutes"
    ADD CONSTRAINT "muse_community_mutes_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."muse_communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_community_mutes"
    ADD CONSTRAINT "muse_community_mutes_muted_by_fkey" FOREIGN KEY ("muted_by") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_community_mutes"
    ADD CONSTRAINT "muse_community_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_connections"
    ADD CONSTRAINT "muse_connections_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_connections"
    ADD CONSTRAINT "muse_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_content_scans"
    ADD CONSTRAINT "muse_content_scans_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_content_scans"
    ADD CONSTRAINT "muse_content_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_disclosures"
    ADD CONSTRAINT "muse_disclosures_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_disclosures"
    ADD CONSTRAINT "muse_disclosures_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_disclosures"
    ADD CONSTRAINT "muse_disclosures_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_event_rsvps"
    ADD CONSTRAINT "muse_event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."muse_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_event_rsvps"
    ADD CONSTRAINT "muse_event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_feed_comments"
    ADD CONSTRAINT "muse_feed_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_feed_comments"
    ADD CONSTRAINT "muse_feed_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."muse_feed_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_feed_posts"
    ADD CONSTRAINT "muse_feed_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_comments"
    ADD CONSTRAINT "muse_forum_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_comments"
    ADD CONSTRAINT "muse_forum_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."muse_forum_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_posts"
    ADD CONSTRAINT "muse_forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_replies"
    ADD CONSTRAINT "muse_forum_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."muse_forum_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_replies"
    ADD CONSTRAINT "muse_forum_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."muse_forum_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_forum_replies"
    ADD CONSTRAINT "muse_forum_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_matches"
    ADD CONSTRAINT "muse_matches_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_matches"
    ADD CONSTRAINT "muse_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_message_requests"
    ADD CONSTRAINT "muse_message_requests_request_from_fkey" FOREIGN KEY ("request_from") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_message_requests"
    ADD CONSTRAINT "muse_message_requests_request_to_fkey" FOREIGN KEY ("request_to") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_moments"
    ADD CONSTRAINT "muse_moments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_notifications"
    ADD CONSTRAINT "muse_notifications_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_notifications"
    ADD CONSTRAINT "muse_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_photo_likes"
    ADD CONSTRAINT "muse_photo_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_professionals"
    ADD CONSTRAINT "muse_professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_profile_embeddings"
    ADD CONSTRAINT "muse_profile_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_profiles"
    ADD CONSTRAINT "muse_profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_prompt_responses"
    ADD CONSTRAINT "muse_prompt_responses_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."muse_prompt_bank"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_prompt_responses"
    ADD CONSTRAINT "muse_prompt_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_push_subscriptions"
    ADD CONSTRAINT "muse_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_referral_rewards"
    ADD CONSTRAINT "muse_referral_rewards_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_referral_rewards"
    ADD CONSTRAINT "muse_referral_rewards_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "public"."muse_referrals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_referrals"
    ADD CONSTRAINT "muse_referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_referrals"
    ADD CONSTRAINT "muse_referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_refund_requests"
    ADD CONSTRAINT "muse_refund_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_refund_requests"
    ADD CONSTRAINT "muse_refund_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."muse_profiles"("id");



ALTER TABLE ONLY "public"."muse_refund_requests"
    ADD CONSTRAINT "muse_refund_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_reviews"
    ADD CONSTRAINT "muse_reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_reviews"
    ADD CONSTRAINT "muse_reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_reviews"
    ADD CONSTRAINT "muse_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_rsvps"
    ADD CONSTRAINT "muse_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."muse_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_rsvps"
    ADD CONSTRAINT "muse_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_safety_checkins"
    ADD CONSTRAINT "muse_safety_checkins_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_safety_checkins"
    ADD CONSTRAINT "muse_safety_checkins_disclosure_id_fkey" FOREIGN KEY ("disclosure_id") REFERENCES "public"."muse_disclosures"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_safety_checkins"
    ADD CONSTRAINT "muse_safety_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_safety_incidents"
    ADD CONSTRAINT "muse_safety_incidents_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_safety_incidents"
    ADD CONSTRAINT "muse_safety_incidents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_safety_profiles"
    ADD CONSTRAINT "muse_safety_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_safety_shares"
    ADD CONSTRAINT "muse_safety_shares_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."muse_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_safety_shares"
    ADD CONSTRAINT "muse_safety_shares_disclosure_id_fkey" FOREIGN KEY ("disclosure_id") REFERENCES "public"."muse_disclosures"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_safety_shares"
    ADD CONSTRAINT "muse_safety_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_saved_searches"
    ADD CONSTRAINT "muse_saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_sessions"
    ADD CONSTRAINT "muse_sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_strikes"
    ADD CONSTRAINT "muse_strikes_appeal_resolved_by_fkey" FOREIGN KEY ("appeal_resolved_by") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_strikes"
    ADD CONSTRAINT "muse_strikes_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."muse_strikes"
    ADD CONSTRAINT "muse_strikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_stripe_connect"
    ADD CONSTRAINT "muse_stripe_connect_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_verification_sessions"
    ADD CONSTRAINT "muse_verification_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."muse_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muse_waitlist"
    ADD CONSTRAINT "muse_waitlist_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."muse_profiles"("id") ON DELETE SET NULL;



CREATE POLICY "AI docs are service-only" ON "public"."muse_ai_docs" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Admin audit is service-only" ON "public"."muse_admin_audit_log" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Allow inserts" ON "public"."form_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Briefs viewable by all" ON "public"."muse_briefs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Communities are public" ON "public"."muse_communities" FOR SELECT USING (true);



CREATE POLICY "Community members are public" ON "public"."muse_community_members" FOR SELECT USING (true);



CREATE POLICY "Disclosure parties can read" ON "public"."muse_disclosures" FOR SELECT USING ((("proposer_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("responder_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Embeddings are service-only" ON "public"."muse_profile_embeddings" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Events are public" ON "public"."muse_events" FOR SELECT USING (true);



CREATE POLICY "Feed posts viewable by all" ON "public"."muse_feed_posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Forum posts viewable by all" ON "public"."muse_forum_posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Forum replies are public" ON "public"."muse_forum_replies" FOR SELECT USING (true);



CREATE POLICY "Payers and payees see payments" ON "public"."muse_booking_payments" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_booking_payments"."payer_id"))) OR (( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_booking_payments"."payee_id")))));



CREATE POLICY "Prompts are public read" ON "public"."muse_prompt_bank" FOR SELECT USING (true);



CREATE POLICY "Service can manage events_delete" ON "public"."muse_events" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service can manage events_insert" ON "public"."muse_events" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service can manage events_update" ON "public"."muse_events" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role reads" ON "public"."form_submissions" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Sessions are public" ON "public"."muse_sessions" FOR SELECT USING (true);



CREATE POLICY "Users can delete own connections" ON "public"."muse_connections" FOR DELETE USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own profile" ON "public"."muse_profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "auth_id"));



CREATE POLICY "Users can view own strikes" ON "public"."muse_strikes" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users delete own RSVPs" ON "public"."muse_rsvps" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users insert own RSVPs" ON "public"."muse_rsvps" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users manage own responses" ON "public"."muse_prompt_responses" USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users manage own safety profile" ON "public"."muse_safety_profiles" USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users read own RSVPs" ON "public"."muse_rsvps" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users read own profile" ON "public"."muse_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "auth_id"));



CREATE POLICY "Users see own connect" ON "public"."muse_stripe_connect" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_stripe_connect"."user_id"))));



CREATE POLICY "Users see own referrals" ON "public"."muse_referrals" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_referrals"."referrer_id"))));



CREATE POLICY "Users see own rewards" ON "public"."muse_referral_rewards" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_referral_rewards"."recipient_id"))));



CREATE POLICY "Users view own check-ins" ON "public"."muse_safety_checkins" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users view own shares" ON "public"."muse_safety_shares" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_ai_docs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_album_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_album_access_select" ON "public"."muse_album_access" FOR SELECT USING ((("viewer_profile_id" = "public"."muse_current_profile_id"()) OR "public"."muse_owns_album"("album_id")));



CREATE POLICY "muse_album_access_write_delete" ON "public"."muse_album_access" FOR DELETE TO "authenticated" USING ("public"."muse_owns_album"("album_id"));



CREATE POLICY "muse_album_access_write_insert" ON "public"."muse_album_access" FOR INSERT TO "authenticated" WITH CHECK ("public"."muse_owns_album"("album_id"));



CREATE POLICY "muse_album_access_write_update" ON "public"."muse_album_access" FOR UPDATE TO "authenticated" USING ("public"."muse_owns_album"("album_id")) WITH CHECK ("public"."muse_owns_album"("album_id"));



ALTER TABLE "public"."muse_album_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_album_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_album_photos_select" ON "public"."muse_album_photos" FOR SELECT USING ("public"."muse_can_view_album"("album_id"));



CREATE POLICY "muse_album_photos_write_delete" ON "public"."muse_album_photos" FOR DELETE TO "authenticated" USING ("public"."muse_owns_album"("album_id"));



CREATE POLICY "muse_album_photos_write_insert" ON "public"."muse_album_photos" FOR INSERT TO "authenticated" WITH CHECK ("public"."muse_owns_album"("album_id"));



CREATE POLICY "muse_album_photos_write_update" ON "public"."muse_album_photos" FOR UPDATE TO "authenticated" USING ("public"."muse_owns_album"("album_id")) WITH CHECK ("public"."muse_owns_album"("album_id"));



ALTER TABLE "public"."muse_albums" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_albums_delete" ON "public"."muse_albums" FOR DELETE TO "authenticated" USING (("profile_id" = "public"."muse_current_profile_id"()));



CREATE POLICY "muse_albums_insert" ON "public"."muse_albums" FOR INSERT TO "authenticated" WITH CHECK (("profile_id" = "public"."muse_current_profile_id"()));



CREATE POLICY "muse_albums_select" ON "public"."muse_albums" FOR SELECT USING ((("access_level" = 'public'::"text") OR "public"."muse_owns_album"("id")));



CREATE POLICY "muse_albums_update" ON "public"."muse_albums" FOR UPDATE TO "authenticated" USING (("profile_id" = "public"."muse_current_profile_id"())) WITH CHECK (("profile_id" = "public"."muse_current_profile_id"()));



ALTER TABLE "public"."muse_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_blocks_delete" ON "public"."muse_blocks" FOR DELETE TO "authenticated" USING (("user_id" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_blocks_insert" ON "public"."muse_blocks" FOR INSERT TO "authenticated" WITH CHECK (("user_id" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_blocks_owner" ON "public"."muse_blocks" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_booking_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_bookings_insert" ON "public"."muse_bookings" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_bookings_select" ON "public"."muse_bookings" FOR SELECT TO "authenticated" USING ((("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("host_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."muse_boost_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_brief_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_briefs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_briefs_insert" ON "public"."muse_briefs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_briefs"."author_id"))));



ALTER TABLE "public"."muse_call_recording_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_community_bans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_community_join_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_community_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_community_members_delete" ON "public"."muse_community_members" FOR DELETE TO "authenticated" USING ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_community_members_insert" ON "public"."muse_community_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_community_mutes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_connections_insert" ON "public"."muse_connections" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_connections_select" ON "public"."muse_connections" FOR SELECT TO "authenticated" USING (((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (("target_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."muse_content_scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_content_scans_owner" ON "public"."muse_content_scans" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_disclosures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_error_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_error_logs_service_only" ON "public"."muse_error_logs" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."muse_event_rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_events_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_events_log_service_only" ON "public"."muse_events_log" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."muse_feed_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_feed_insert" ON "public"."muse_feed_posts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_feed_posts"."author_id"))));



ALTER TABLE "public"."muse_feed_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_feed_update" ON "public"."muse_feed_posts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = "muse_feed_posts"."author_id"))));



ALTER TABLE "public"."muse_forum_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_forum_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_forum_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_forum_replies_insert" ON "public"."muse_forum_replies" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_landing_analytics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_landing_analytics_service" ON "public"."muse_landing_analytics" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."muse_matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_matches_insert" ON "public"."muse_matches" FOR INSERT TO "authenticated" WITH CHECK (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_matches_select" ON "public"."muse_matches" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "muse_profiles"."auth_id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."id" = ANY (ARRAY["muse_matches"."user_id", "muse_matches"."target_id"])))));



ALTER TABLE "public"."muse_message_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_messages_insert" ON "public"."muse_messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_messages_select" ON "public"."muse_messages" FOR SELECT TO "authenticated" USING ((("sender_id" = ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("receiver_id" = ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."muse_moments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_ncmec_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_notifications_owner" ON "public"."muse_notifications" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_photo_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_professionals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_profile_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_prompt_bank" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_prompt_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_push_delete" ON "public"."muse_push_subscriptions" FOR DELETE TO "authenticated" USING ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_push_insert" ON "public"."muse_push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_push_select" ON "public"."muse_push_subscriptions" FOR SELECT TO "authenticated" USING ((("user_id")::"text" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_qr_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_qr_events_service" ON "public"."muse_qr_events" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."muse_quests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_referral_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_refund_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_reports_insert" ON "public"."muse_reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "muse_reports_owner" ON "public"."muse_reports" FOR SELECT TO "authenticated" USING (("reporter_id" IN ( SELECT ("muse_profiles"."id")::"text" AS "id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_safety_checkins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_safety_incidents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_safety_incidents_owner" ON "public"."muse_safety_incidents" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_safety_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_safety_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_saved_searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_storage_cleanup_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_strikes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_stripe_connect" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muse_verification_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_verification_sessions_owner" ON "public"."muse_verification_sessions" FOR SELECT USING (("user_id" IN ( SELECT "muse_profiles"."id"
   FROM "public"."muse_profiles"
  WHERE ("muse_profiles"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."muse_waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muse_waitlist_owner" ON "public"."muse_waitlist" FOR SELECT USING (("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text"));



CREATE POLICY "ncmec_service_only" ON "public"."muse_ncmec_reports" USING (false);



CREATE POLICY "professionals_delete" ON "public"."muse_professionals" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "professionals_select" ON "public"."muse_professionals" FOR SELECT USING (true);



CREATE POLICY "professionals_update" ON "public"."muse_professionals" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "professionals_upsert" ON "public"."muse_professionals" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."schema_migrations" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."atomic_like_count"("table_name" "text", "row_id" "uuid", "delta" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."atomic_like_count"("table_name" "text", "row_id" "uuid", "delta" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_claim_founding_trigger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_claim_founding_trigger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_rate"("p_key" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_rate"("p_key" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_founding_status"("target_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_founding_status"("target_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_muse_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_muse_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."muse_can_view_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."muse_can_view_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."muse_can_view_album"("p_album_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."muse_current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."muse_current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."muse_current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."muse_owns_album"("p_album_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."muse_owns_album"("p_album_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."muse_owns_album"("p_album_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."report_to_ncmec"("p_incident_id" "uuid", "p_report_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_to_ncmec"("p_incident_id" "uuid", "p_report_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."muse_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."muse_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."muse_admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."muse_admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."muse_ai_docs" TO "anon";
GRANT ALL ON TABLE "public"."muse_ai_docs" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_ai_docs" TO "service_role";



GRANT ALL ON TABLE "public"."muse_album_access" TO "anon";
GRANT ALL ON TABLE "public"."muse_album_access" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_album_access" TO "service_role";



GRANT ALL ON TABLE "public"."muse_album_likes" TO "anon";
GRANT ALL ON TABLE "public"."muse_album_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_album_likes" TO "service_role";



GRANT ALL ON TABLE "public"."muse_album_photos" TO "anon";
GRANT ALL ON TABLE "public"."muse_album_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_album_photos" TO "service_role";



GRANT ALL ON TABLE "public"."muse_albums" TO "anon";
GRANT ALL ON TABLE "public"."muse_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_albums" TO "service_role";



GRANT ALL ON TABLE "public"."muse_blocks" TO "anon";
GRANT ALL ON TABLE "public"."muse_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."muse_booking_payments" TO "anon";
GRANT ALL ON TABLE "public"."muse_booking_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_booking_payments" TO "service_role";



GRANT ALL ON TABLE "public"."muse_bookings" TO "anon";
GRANT ALL ON TABLE "public"."muse_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."muse_boost_purchases" TO "anon";
GRANT ALL ON TABLE "public"."muse_boost_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_boost_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."muse_brief_applications" TO "anon";
GRANT ALL ON TABLE "public"."muse_brief_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_brief_applications" TO "service_role";



GRANT ALL ON TABLE "public"."muse_briefs" TO "anon";
GRANT ALL ON TABLE "public"."muse_briefs" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_briefs" TO "service_role";



GRANT ALL ON TABLE "public"."muse_call_recording_consents" TO "anon";
GRANT ALL ON TABLE "public"."muse_call_recording_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_call_recording_consents" TO "service_role";



GRANT ALL ON TABLE "public"."muse_calls" TO "anon";
GRANT ALL ON TABLE "public"."muse_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_calls" TO "service_role";



GRANT ALL ON TABLE "public"."muse_communities" TO "anon";
GRANT ALL ON TABLE "public"."muse_communities" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_communities" TO "service_role";



GRANT ALL ON TABLE "public"."muse_community_bans" TO "anon";
GRANT ALL ON TABLE "public"."muse_community_bans" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_community_bans" TO "service_role";



GRANT ALL ON TABLE "public"."muse_community_join_requests" TO "anon";
GRANT ALL ON TABLE "public"."muse_community_join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_community_join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."muse_community_members" TO "anon";
GRANT ALL ON TABLE "public"."muse_community_members" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_community_members" TO "service_role";



GRANT ALL ON TABLE "public"."muse_community_mutes" TO "anon";
GRANT ALL ON TABLE "public"."muse_community_mutes" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_community_mutes" TO "service_role";



GRANT ALL ON TABLE "public"."muse_connections" TO "anon";
GRANT ALL ON TABLE "public"."muse_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_connections" TO "service_role";



GRANT ALL ON TABLE "public"."muse_content_scans" TO "anon";
GRANT ALL ON TABLE "public"."muse_content_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_content_scans" TO "service_role";



GRANT ALL ON TABLE "public"."muse_disclosures" TO "anon";
GRANT ALL ON TABLE "public"."muse_disclosures" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_disclosures" TO "service_role";



GRANT ALL ON TABLE "public"."muse_error_logs" TO "anon";
GRANT ALL ON TABLE "public"."muse_error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."muse_event_rsvps" TO "anon";
GRANT ALL ON TABLE "public"."muse_event_rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_event_rsvps" TO "service_role";



GRANT ALL ON TABLE "public"."muse_events" TO "anon";
GRANT ALL ON TABLE "public"."muse_events" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_events" TO "service_role";



GRANT ALL ON TABLE "public"."muse_events_log" TO "anon";
GRANT ALL ON TABLE "public"."muse_events_log" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_events_log" TO "service_role";



GRANT ALL ON TABLE "public"."muse_feed_comments" TO "anon";
GRANT ALL ON TABLE "public"."muse_feed_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_feed_comments" TO "service_role";



GRANT ALL ON TABLE "public"."muse_feed_posts" TO "anon";
GRANT ALL ON TABLE "public"."muse_feed_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_feed_posts" TO "service_role";



GRANT ALL ON TABLE "public"."muse_forum_comments" TO "anon";
GRANT ALL ON TABLE "public"."muse_forum_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_forum_comments" TO "service_role";



GRANT ALL ON TABLE "public"."muse_forum_posts" TO "anon";
GRANT ALL ON TABLE "public"."muse_forum_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_forum_posts" TO "service_role";



GRANT ALL ON TABLE "public"."muse_forum_replies" TO "anon";
GRANT ALL ON TABLE "public"."muse_forum_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_forum_replies" TO "service_role";



GRANT ALL ON TABLE "public"."muse_landing_analytics" TO "anon";
GRANT ALL ON TABLE "public"."muse_landing_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_landing_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."muse_matches" TO "anon";
GRANT ALL ON TABLE "public"."muse_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_matches" TO "service_role";



GRANT ALL ON TABLE "public"."muse_message_requests" TO "anon";
GRANT ALL ON TABLE "public"."muse_message_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_message_requests" TO "service_role";



GRANT ALL ON TABLE "public"."muse_messages" TO "anon";
GRANT ALL ON TABLE "public"."muse_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_messages" TO "service_role";



GRANT ALL ON TABLE "public"."muse_moments" TO "anon";
GRANT ALL ON TABLE "public"."muse_moments" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_moments" TO "service_role";



GRANT ALL ON TABLE "public"."muse_ncmec_reports" TO "anon";
GRANT ALL ON TABLE "public"."muse_ncmec_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_ncmec_reports" TO "service_role";



GRANT ALL ON TABLE "public"."muse_notifications" TO "anon";
GRANT ALL ON TABLE "public"."muse_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."muse_photo_likes" TO "anon";
GRANT ALL ON TABLE "public"."muse_photo_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_photo_likes" TO "service_role";



GRANT ALL ON TABLE "public"."muse_professionals" TO "anon";
GRANT ALL ON TABLE "public"."muse_professionals" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_professionals" TO "service_role";



GRANT ALL ON TABLE "public"."muse_profile_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."muse_profile_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_profile_embeddings" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."muse_profiles" TO "anon";
GRANT ALL ON TABLE "public"."muse_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."muse_prompt_bank" TO "anon";
GRANT ALL ON TABLE "public"."muse_prompt_bank" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_prompt_bank" TO "service_role";



GRANT ALL ON TABLE "public"."muse_prompt_responses" TO "anon";
GRANT ALL ON TABLE "public"."muse_prompt_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_prompt_responses" TO "service_role";



GRANT ALL ON TABLE "public"."muse_push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."muse_push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."muse_qr_events" TO "anon";
GRANT ALL ON TABLE "public"."muse_qr_events" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_qr_events" TO "service_role";



GRANT ALL ON TABLE "public"."muse_quests" TO "anon";
GRANT ALL ON TABLE "public"."muse_quests" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_quests" TO "service_role";



GRANT ALL ON TABLE "public"."muse_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."muse_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."muse_referral_rewards" TO "anon";
GRANT ALL ON TABLE "public"."muse_referral_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_referral_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."muse_referrals" TO "anon";
GRANT ALL ON TABLE "public"."muse_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."muse_refund_requests" TO "anon";
GRANT ALL ON TABLE "public"."muse_refund_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_refund_requests" TO "service_role";



GRANT ALL ON TABLE "public"."muse_reports" TO "anon";
GRANT ALL ON TABLE "public"."muse_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_reports" TO "service_role";



GRANT ALL ON TABLE "public"."muse_reviews" TO "anon";
GRANT ALL ON TABLE "public"."muse_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."muse_rsvps" TO "anon";
GRANT ALL ON TABLE "public"."muse_rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_rsvps" TO "service_role";



GRANT ALL ON TABLE "public"."muse_safety_checkins" TO "anon";
GRANT ALL ON TABLE "public"."muse_safety_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_safety_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."muse_safety_incidents" TO "anon";
GRANT ALL ON TABLE "public"."muse_safety_incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_safety_incidents" TO "service_role";



GRANT ALL ON TABLE "public"."muse_safety_profiles" TO "anon";
GRANT ALL ON TABLE "public"."muse_safety_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_safety_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."muse_safety_shares" TO "anon";
GRANT ALL ON TABLE "public"."muse_safety_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_safety_shares" TO "service_role";



GRANT ALL ON TABLE "public"."muse_saved_searches" TO "anon";
GRANT ALL ON TABLE "public"."muse_saved_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_saved_searches" TO "service_role";



GRANT ALL ON TABLE "public"."muse_sessions" TO "anon";
GRANT ALL ON TABLE "public"."muse_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."muse_storage_cleanup_jobs" TO "anon";
GRANT ALL ON TABLE "public"."muse_storage_cleanup_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_storage_cleanup_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."muse_strikes" TO "anon";
GRANT ALL ON TABLE "public"."muse_strikes" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_strikes" TO "service_role";



GRANT ALL ON TABLE "public"."muse_stripe_connect" TO "anon";
GRANT ALL ON TABLE "public"."muse_stripe_connect" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_stripe_connect" TO "service_role";



GRANT ALL ON TABLE "public"."muse_verification_sessions" TO "anon";
GRANT ALL ON TABLE "public"."muse_verification_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_verification_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."muse_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."muse_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."muse_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."schema_migrations" TO "anon";
GRANT ALL ON TABLE "public"."schema_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_migrations" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







