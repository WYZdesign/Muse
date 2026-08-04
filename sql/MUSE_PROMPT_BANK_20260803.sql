-- Muse Prompt Bank — 25-30 curated prompts per user category
-- Run in Supabase SQL Editor after MUSE_TRUST_SAFETY_20260803.sql
-- Created: 2026-08-03
-- Each prompt has structured choices where applicable for embedding-based matching

-- ============================================================
-- GENERAL (all users see these first)
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('general', 'What does your creative practice mean to you in one sentence?', 'text', '[]', 1),
('general', 'How would you describe your creative energy in 3 words?', 'text', '[]', 2),
('general', 'What time of day do you do your best creative work?', 'single_choice', '["Early morning (5-9am)", "Midday (10am-2pm)", "Afternoon (2-6pm)", "Evening (6-10pm)", "Late night (10pm-2am)", "Anytime inspiration strikes"]', 3),
('general', 'What''s your ideal collaboration style?', 'single_choice', '["I lead the vision", "I co-create equally", "I follow and execute", "Depends on the project", "I work alone but share results"]', 4),
('general', 'How do you handle creative block?', 'text', '[]', 5),
('general', 'What''s the last creative risk you took?', 'text', '[]', 6),
('general', 'Pick your creative fuel:', 'single_choice', '["Coffee", "Tea", "Music", "Silence", "Nature", "Urban energy", "Other substances (legal)", "Just vibes"]', 7),
('general', 'What''s your relationship with social media as a creative?', 'single_choice', '["It''s essential for my career", "Necessary evil", "I share but don''t scroll", "I avoid it", "I''m trying to use it less"]', 8),
('general', 'What role does vulnerability play in your work?', 'text', '[]', 9),
('general', 'Describe your ideal creative day from start to finish.', 'text', '[]', 10),
('general', 'What''s a skill outside your discipline that makes you better at your craft?', 'text', '[]', 11),
('general', 'How do you know when a project is truly finished?', 'text', '[]', 12),
('general', 'What''s the most underrated creative tool you own?', 'text', '[]', 13),
('general', 'When you''re not creating, what are you doing?', 'text', '[]', 14),
('general', 'What''s your creative guilty pleasure?', 'text', '[]', 15),
('general', 'Pick your ideal project scope:', 'single_choice', '["Quick one-off (1-2 hours)", "Half-day session", "Full day production", "Multi-day project", "Ongoing series", "Long-term campaign"]', 16),
('general', 'What does collaboration mean to you?', 'text', '[]', 17),
('general', 'How do you give and receive creative feedback?', 'text', '[]', 18),
('general', 'What''s a creative hill you''ll die on?', 'text', '[]', 19),
('general', 'What''s the last thing that made you stop scrolling and think "that''s brilliant"?', 'text', '[]', 20),
('general', 'How important is technical perfection vs. emotional impact in your work?', 'single_choice', '["Technical perfection always", "Mostly technical, some emotion", "Equal balance", "Mostly emotion, some technique", "Raw emotion over polish"]', 21),
('general', 'Pick your ideal collab partner:', 'single_choice', '["Someone exactly like me", "Someone complementary", "Someone who challenges me", "Someone more experienced", "Someone less experienced I can mentor"]', 22),
('general', 'What''s your stance on AI in creative work?', 'single_choice', '["Embrace it fully", "Use it as a tool", "Keep it separate from art", "Actively oppose it", "Haven''t decided yet"]', 23),
('general', 'What would make you cancel a shoot last minute?', 'text', '[]', 24),
('general', 'What''s the most important thing a collaborator should know about working with you?', 'text', '[]', 25);

-- ============================================================
-- PHOTOGRAPHER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('photographer', 'What''s your primary photography style?', 'multi_choice', '["Portrait", "Fashion", "Editorial", "Commercial", "Fine Art", "Documentary", "Street", "Landscape", "Product", "Food", "Architecture", "Boudoir", "Conceptual"]', 100),
('photographer', 'What camera system do you shoot?', 'single_choice', '["Canon", "Nikon", "Sony", "Fujifilm", "Leica", "Hasselblad", "Medium Format Digital", "Film (35mm)", "Film (120/220)", "Mirrorless other", "Phone camera"]', 101),
('photographer', 'What''s your go-to lens for portraits?', 'single_choice', '["85mm f/1.4", "85mm f/1.8", "50mm f/1.2", "50mm f/1.4", "70-200mm f/2.8", "35mm f/1.4", "105mm f/2.8 Macro", "Other prime", "Zoom only"]', 102),
('photographer', 'How do you approach lighting?', 'text', '[]', 103),
('photographer', 'What''s your ideal lighting setup?', 'single_choice', '["Natural light only", "Natural + reflector", "Single strobe", "Multi-light studio", "Available/practical light", "Mixed (depends on project)"]', 104),
('photographer', 'How do you direct models/subjects?', 'text', '[]', 105),
('photographer', 'What''s your editing workflow?', 'single_choice', '["Lightroom only", "Lightroom + Photoshop", "Capture One", "Darktable/open source", "Minimal edits, mostly SOOC", "Heavy retouching", "Film scanning + digital"]', 106),
('photographer', 'What''s your turnaround time for edited photos?', 'single_choice', '["Same day", "1-3 days", "1 week", "2 weeks", "1 month", "Varies by project"]', 107),
('photographer', 'Do you offer TFP (Time for Print) shoots?', 'single_choice', '["Always open to TFP", "Selective TFP", "Paid only", "New photographers only", "Depends on the concept"]', 108),
('photographer', 'What''s your rate structure?', 'single_choice', '["Hourly", "Half-day / Full-day", "Per project", "Package-based", "Negotiable", "Free for TFP", "Don''t discuss rates publicly"]', 109),
('photographer', 'What portfolio piece are you most proud of and why?', 'text', '[]', 110),
('photographer', 'How do you find your subjects/models?', 'text', '[]', 111),
('photographer', 'What''s the hardest shoot you''ve done?', 'text', '[]', 112),
('photographer', 'Describe your post-processing philosophy.', 'text', '[]', 113),
('photographer', 'What do models/subjects need to bring to a shoot?', 'text', '[]', 114),
('photographer', 'How do you handle creative differences during a shoot?', 'text', '[]', 115),
('photographer', 'What''s your favorite type of location to shoot?', 'text', '[]', 116),
('photographer', 'Do you work with a team (MUA, stylist, etc.)?', 'single_choice', '["Always have a full team", "Sometimes", "Just me and the subject", "I prefer working solo", "Open to team shoots"]', 117),
('photographer', 'How do you prepare for a shoot?', 'text', '[]', 118),
('photographer', 'What''s the most creative concept you''ve executed?', 'text', '[]', 119),
('photographer', 'What makes a model/subject stand out to you?', 'text', '[]', 120),
('photographer', 'How do you ensure everyone feels comfortable during a shoot?', 'text', '[]', 121),
('photographer', 'What''s your policy on sharing/editing photos?', 'text', '[]', 122),
('photographer', 'What do you wish models knew before a shoot?', 'text', '[]', 123),
('photographer', 'How do you handle weather/location issues?', 'text', '[]', 124),
('photographer', 'Pick your ideal shoot vibe:', 'single_choice', '["Structured and planned", "Spontaneous and fluid", "Cinematic and moody", "Bright and airy", "Dark and dramatic", "Raw and editorial", "Playful and fun"]', 125);

-- ============================================================
-- MODEL
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('model', 'What type of modeling do you do?', 'multi_choice', '["Fashion", "Commercial", "Editorial", "Fine Art", "Portrait", "Fitness", "Boudoir", "Glamour", "Parts (hands, feet, etc.)", "Body paint", "Body-positive", "Alternative", "Other"]', 200),
('model', 'What''s your experience level?', 'single_choice', '["Brand new (first 6 months)", "Beginner (6 months - 2 years)", "Intermediate (2-5 years)", "Experienced (5-10 years)", "Professional (10+ years)", "Agency-represented"]', 201),
('model', 'Are you agency-represented?', 'single_choice', '["Yes, exclusive", "Yes, non-exclusive", "No, freelance", "Previously, now freelance", "Looking for representation"]', 202),
('model', 'What''s your height range?', 'single_choice', '["Under 5''4\"", "5''4\" - 5''6\"", "5''7\" - 5''9\"", "5''10\" - 6''0\"", "Over 6''0\"", "Prefer not to say"]', 203),
('model', 'How do you prefer to communicate before a shoot?', 'text', '[]', 204),
('model', 'What''s your boundary around nudity?', 'single_choice', '["No nudity at all", "Implied/artistic only", "Artistic nude with boundaries", "Full artistic nude", "Prefer not to discuss here"]', 205),
('model', 'What makes you feel most confident on set?', 'text', '[]', 206),
('model', 'How do you prepare for a shoot?', 'text', '[]', 207),
('model', 'What''s your must-have in a shoot agreement?', 'text', '[]', 208),
('model', 'What do you wish photographers understood?', 'text', '[]', 209),
('model', 'How do you handle a shoot that isn''t going well?', 'text', '[]', 210),
('model', 'What''s the best creative collaboration you''ve had?', 'text', '[]', 211),
('model', 'Do you work with MUA/stylists, or do your own?', 'single_choice', '["I do my own MUA", "I prefer MUA provided", "I have my own team", "Depends on the shoot", "Open to either"]', 212),
('model', 'What''s your availability like?', 'single_choice', '["Weekdays only", "Weekends only", "Flexible", "Limited (full-time job)", "Very limited", "Full-time available"]', 213),
('model', 'What''s your rate structure?', 'single_choice', '["Hourly", "Half-day / Full-day", "Per shoot", "TFP only", "Negotiable", "Free for good concepts", "Don''t discuss rates publicly"]', 214),
('model', 'How do you handle travel to shoots?', 'text', '[]', 215),
('model', 'What''s your comfort level with different environments?', 'text', '[]', 216),
('model', 'Do you have references or a portfolio I can review?', 'text', '[]', 217),
('model', 'What''s a red flag for you when booking a shoot?', 'text', '[]', 218),
('model', 'How do you protect yourself professionally?', 'text', '[]', 219),
('model', 'What''s the most challenging part of being a model?', 'text', '[]', 220),
('model', 'How do you build trust with a new photographer?', 'text', '[]', 221),
('model', 'What does professionalism mean to you on set?', 'text', '[]', 222),
('model', 'What''s your ideal shoot duration?', 'single_choice', '["1-2 hours", "3-4 hours", "Half day (4-5 hours)", "Full day (8+ hours)", "Multi-day", "Depends on the project"]', 223),
('model', 'Pick your ideal model-photographer dynamic:', 'single_choice', '["Collaborative from concept stage", "Photographer leads, I contribute", "I bring my own concepts", "Strictly professional", "Friends who also shoot together"]', 224),
('model', 'What do you want your portfolio to communicate?', 'text', '[]', 225);

-- ============================================================
-- ACTOR / PERFORMER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('actor', 'What type of acting do you do?', 'multi_choice', '["Film", "Television", "Theater", "Commercial", "Voiceover", "Improv", "Musical theater", "Web series", "Short film", "Student film", "Other"]', 300),
('actor', 'What''s your training background?', 'text', '[]', 301),
('actor', 'What are your strongest roles?', 'multi_choice', '["Lead", "Supporting", "Character", "Comedic", "Dramatic", "Action", "Period piece", "Contemporary", "Voice roles", "Ensemble"]', 302),
('actor', 'Do you do your own stunts/fight choreography?', 'single_choice', '["Yes, trained", "With supervision", "Prefer stunt double", "Not applicable", "Open to learning"]', 303),
('actor', 'How do you approach self-tapes?', 'text', '[]', 304),
('actor', 'What''s your reel looking like?', 'single_choice', '["Polished reel ready", "Working on it", "Need headshots first", "Have clips but no reel", "Just starting out"]', 305),
('actor', 'What do you bring to a creative collaboration that''s unique?', 'text', '[]', 306),
('actor', 'How do you prepare for auditions?', 'text', '[]', 307),
('actor', 'What''s your ideal role?', 'text', '[]', 308),
('actor', 'Pick your ideal project:', 'single_choice', '["Indie film with creative freedom", "Commercial work for steady income", "Web series to build audience", "Theater for craft development", "Voiceover from home", "Anything with good people"]', 309),
('actor', 'How do you handle rejection?', 'text', '[]', 310),
('actor', 'What''s the most transformative role you''ve played?', 'text', '[]', 311),
('actor', 'Do you write/direct as well?', 'single_choice', '["Yes, I create my own content", "I''m learning", "Acting only", "I direct occasionally", "Writing + acting"]', 312),
('actor', 'How do you build your network?', 'text', '[]', 313),
('actor', 'What''s your relationship with casting directors?', 'text', '[]', 314),
('actor', 'What makes a great scene partner?', 'text', '[]', 315),
('actor', 'How do you balance craft and commerce?', 'text', '[]', 316),
('actor', 'What''s the indie film scene like in your area?', 'text', '[]', 317),
('actor', 'Do you have representation?', 'single_choice', '["Agent + manager", "Agent only", "Manager only", "Casting director relationships", "Self-represented", "Looking for representation"]', 318),
('actor', 'What''s your typecast and how do you feel about it?', 'text', '[]', 319),
('actor', 'How do you stay sharp between gigs?', 'text', '[]', 320),
('actor', 'What''s a project you''d do for free?', 'text', '[]', 321),
('actor', 'Pick your ideal collaboration:', 'single_choice', '["Director with a strong vision", "Fellow actors who push me", "A ensemble cast", "One-on-one intimate scenes", "Large production with resources", "DIY guerrilla filmmaking"]', 322);

-- ============================================================
-- VIDEOGRAPHER / FILMMAKER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('videographer', 'What type of video work do you do?', 'multi_choice', '["Music videos", "Short films", "Documentary", "Commercial/brand", "Event coverage", "Social media content", "Wedding", "Corporate", "Tutorial/educational", "Animation/motion graphics", "Other"]', 400),
('videographer', 'What camera do you shoot video on?', 'single_choice', '["Sony (A7 series, FX series)", "Canon (R series, C series)", "Blackmagic", "RED", "ARRI", "Panasonic", "GoPro/action", "Phone (cinematic mode)", "Other"]', 401),
('videographer', 'What''s your editing software?', 'single_choice', '["Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "After Effects (motion)", "Avid", "CapCut", "Other"]', 402),
('videographer', 'Do you shoot solo or with a crew?', 'single_choice', '["Always solo", "Small crew (2-3)", "Full crew", "Depends on project", "Prefer crew, can go solo"]', 403),
('videographer', 'What''s your color grading style?', 'text', '[]', 404),
('videographer', 'How do you approach sound design?', 'text', '[]', 405),
('videographer', 'What''s your deliverable format?', 'single_choice', '["4K minimum", "1080p acceptable", "Both 4K + 1080p", "Vertical + horizontal", "Cinema DCP", "Depends on use case"]', 406),
('videographer', 'What''s the most ambitious video project you''ve done?', 'text', '[]', 407),
('videographer', 'How do you price your work?', 'single_choice', '["Day rate", "Project-based", "Package deals", "Hourly", "Negotiable", "TFP equivalent", "Don''t discuss publicly"]', 408),
('videographer', 'What makes a good B-roll sequence?', 'text', '[]', 409),
('videographer', 'How do you handle client revisions?', 'text', '[]', 410),
('videographer', 'What''s your render/export workflow?', 'text', '[]', 411),
('videographer', 'Do you offer motion graphics/VFX?', 'single_choice', '["Yes, full VFX", "Basic motion graphics", "After Effects only", "Third-party", "Not yet, learning"]', 412),
('videographer', 'What''s your ideal project length?', 'single_choice', '["30-second social clip", "1-2 minute brand film", "3-5 minute narrative", "10-20 minute short", "Feature length", "Ongoing series"]', 413),
('videographer', 'How do you storyboards?', 'text', '[]', 414),
('videographer', 'What equipment do you wish you had?', 'text', '[]', 415),
('videographer', 'How do you approach interviews?', 'text', '[]', 416),
('videographer', 'What''s your relationship with music in video?', 'text', '[]', 417),
('videographer', 'Pick your ideal shoot day:', 'single_choice', '["Controlled studio", "On-location adventure", "Multiple setups in one day", "Slow and deliberate", "Run and gun", "Hybrid photo + video"]', 418),
('videographer', 'What''s the hardest part of video vs. photography?', 'text', '[]', 419);

-- ============================================================
-- MUSICIAN / PRODUCER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('musician', 'What do you do in music?', 'multi_choice', '["Singer", "Rapper", "Instrumentalist", "Producer", "Songwriter", "Sound engineer", "DJ", "Composer", "Beatmaker", "Multi-instrumentalist", "Other"]', 500),
('musician', 'What genre(s) do you work in?', 'multi_choice', '["Pop", "R&B", "Hip-hop", "Rock", "Indie", "Electronic", "Jazz", "Classical", "Folk", "Country", "Latin", "Afrobeats", "K-pop", "Experimental", "Other"]', 501),
('musician', 'What instrument(s) do you play?', 'text', '[]', 502),
('musician', 'What DAW do you use?', 'single_choice', '["Logic Pro", "Ableton Live", "FL Studio", "Pro Tools", "Studio One", "GarageBand", "Reason", "Bitwig", "Other"]', 503),
('musician', 'Do you have home studio setup?', 'single_choice', '["Full home studio", "Basic bedroom setup", "Working on it", "Use professional studios", "Mobile/portable setup"]', 504),
('musician', 'What''s your creative process for writing?', 'text', '[]', 505),
('musician', 'Are you looking for collaborators?', 'multi_choice', '["Vocalists", "Instrumentalists", "Producers", "Songwriters", "Mix engineers", "Visual artists for covers", "Music video directors", "Dancers/choreographers"]', 506),
('musician', 'What''s the last song you released?', 'text', '[]', 507),
('musician', 'How do you approach music video concepts?', 'text', '[]', 508),
('musician', 'What''s your live performance setup?', 'single_choice', '["Solo acoustic", "Full band", "DJ set", "Electronic/loop pedal", "Orchestral", "Collaborative jam", "No live shows yet"]', 509),
('musician', 'What does collaboration mean in music to you?', 'text', '[]', 510),
('musician', 'How do you split credits on a collab?', 'text', '[]', 511),
('musician', 'What''s your distribution setup?', 'single_choice', '["DistroKid", "TuneCore", "CD Baby", "UnitedMasters", "Label", "DIY/Bandcamp", "Not sure yet"]', 512),
('musician', 'What''s a dream collab?', 'text', '[]', 513),
('musician', 'How do you handle creative differences in the studio?', 'text', '[]', 514),
('musician', 'Pick your ideal studio session:', 'single_choice', '["Structured and scheduled", "All-night creative binge", "Quick session, no pressure", "Full production team", "Just me and the mic", "Collaborative jam session"]', 515),
('musician', 'What do you want listeners to feel?', 'text', '[]', 516),
('musician', 'How do you build an audience?', 'text', '[]', 517),
('musician', 'What''s the business side you struggle with?', 'text', '[]', 518),
('musician', 'What gear can you NOT live without?', 'text', '[]', 519);

-- ============================================================
-- WRITER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('writer', 'What do you write?', 'multi_choice', '["Fiction", "Non-fiction", "Poetry", "Screenplays", "Song lyrics", "Copywriting", "Journalism", "Blogging", "Technical writing", "Academic", "Other"]', 600),
('writer', 'What''s your genre?', 'multi_choice', '["Literary fiction", "Sci-fi", "Fantasy", "Horror", "Romance", "Thriller/mystery", "Historical", "Contemporary", "Memoir", "Essays", "Experimental", "Other"]', 601),
('writer', 'How often do you write?', 'single_choice', '["Daily", "Several times a week", "Weekly", "When inspired", "On deadline only", "Trying to write more"]', 602),
('writer', 'What''s your writing environment?', 'text', '[]', 603),
('writer', 'Do you collaborate visually?', 'single_choice', '["Yes, I write for visual projects", "I write text only", "Open to both", "I illustrate my own work", "Looking for visual collaborators"]', 604),
('writer', 'What''s your relationship with editing?', 'text', '[]', 605),
('writer', 'Pick your ideal project:', 'single_choice', '["Short story collection", "Novel", "Screenplay", "Poetry chapbook", "Essay collection", "Songwriting partnership", "Copy for brands", "Ghostwriting"]', 606),
('writer', 'How do you handle writer''s block?', 'text', '[]', 607),
('writer', 'What inspires your work?', 'text', '[]', 608),
('writer', 'How do you approach collaboration with visual artists?', 'text', '[]', 609),
('writer', 'What''s the most meaningful piece you''ve written?', 'text', '[]', 610),
('writer', 'Do you have published work?', 'single_choice', '["Yes, traditionally published", "Self-published", "Online publications", "Literary magazines", "Not yet, working on it", "Writing for personal growth"]', 611),
('writer', 'What role does feedback play in your process?', 'text', '[]', 612),
('writer', 'How do you protect your creative time?', 'text', '[]', 613),
('writer', 'What''s a creative risk you want to take?', 'text', '[]', 614),
('writer', 'Pick your ideal writing fuel:', 'single_choice', '["Coffee shop energy", "Quiet home office", "Library", "Nature/outdoors", "Late night solitude", "Co-working space"]', 615),
('writer', 'What do you want your work to DO to people?', 'text', '[]', 616);

-- ============================================================
-- DESIGNER
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('designer', 'What kind of design do you do?', 'multi_choice', '["Graphic design", "UI/UX", "Brand identity", "Typography", "Illustration", "Motion graphics", "Packaging", "Environmental/space", "Product design", "Fashion design", "Interior design", "Other"]', 700),
('designer', 'What tools are in your stack?', 'multi_choice', '["Figma", "Adobe CC (Photoshop)", "Adobe CC (Illustrator)", "Adobe CC (InDesign)", "After Effects", "Blender/3D", "Sketch", "Procreate", "Pen and paper", "Code (CSS/HTML)", "Other"]', 701),
('designer', 'How do you approach a new design brief?', 'text', '[]', 702),
('designer', 'What''s your design philosophy?', 'text', '[]', 703),
('designer', 'Do you code as well as design?', 'single_choice', '["Yes, full-stack", "Front-end only", "Basic HTML/CSS", "No coding", "Learning to code", "I prefer design only"]', 704),
('designer', 'What''s the project you''re most proud of?', 'text', '[]', 705),
('designer', 'How do you handle client feedback?', 'text', '[]', 706),
('designer', 'Pick your ideal project:', 'single_choice', '["Brand identity from scratch", "Redesign an existing brand", "App/website UI", "Print campaign", "Packaging design", "Environmental/exhibition", "Personal creative project"]', 707),
('designer', 'What''s your process for presenting work?', 'text', '[]', 708),
('designer', 'How do you stay inspired?', 'text', '[]', 709),
('designer', 'What''s the intersection of design and [other discipline] that excites you?', 'text', '[]', 710),
('designer', 'How do you price your design work?', 'single_choice', '["Hourly", "Project-based", "Value-based", "Retainer", "Package pricing", "Negotiable per project"]', 711),
('designer', 'What design trend are you loving right now?', 'text', '[]', 712),
('designer', 'What design trend needs to die?', 'text', '[]', 713),
('designer', 'How do you balance aesthetics with function?', 'text', '[]', 714),
('designer', 'What do you wish clients understood about design?', 'text', '[]', 715),
('designer', 'Pick your ideal collaboration:', 'single_choice', '["Creative director leads", "Co-design with another designer", "Developer + designer pair", "Photographer + designer", "Full creative team", "Solo with feedback checkpoints"]', 716),
('designer', 'What''s your typography style?', 'single_choice', '["Clean and minimal", "Bold and expressive", "Vintage/retro", "Hand-drawn", "Experimental", "Serif-heavy", "Sans-serif everything", "Mix and match"]', 717);

-- ============================================================
-- INFLUENCER / CONTENT CREATOR
-- ============================================================
INSERT INTO muse_prompt_bank (category, prompt_text, prompt_type, choices, display_order) VALUES
('influencer', 'What platforms do you create on?', 'multi_choice', '["Instagram", "TikTok", "YouTube", "X/Twitter", "Threads", "LinkedIn", "Pinterest", "Twitch", "Podcast", "Substack/Newsletter", "Other"]', 800),
('influencer', 'What''s your content niche?', 'multi_choice', '["Fashion/beauty", "Lifestyle", "Travel", "Food", "Fitness", "Tech", "Art/creative", "Music", "Education", "Comedy", "Business", "Other"]', 801),
('influencer', 'What''s your follower count range?', 'single_choice', '["Under 1K (starting out)", "1K-10K (micro)", "10K-50K (rising)", "50K-100K (established)", "100K+ (macro)", "Prefer not to say"]', 802),
('influencer', 'How often do you post?', 'single_choice', '["Multiple times daily", "Daily", "Several times a week", "Weekly", "When I have something good", "Irregularly"]', 803),
('influencer', 'Do you collaborate with brands?', 'single_choice', '["Yes, actively seeking partnerships", "Selective brand deals", "Open to the right brands", "No sponsored content", "New to brand work"]', 804),
('influencer', 'What''s your content creation style?', 'text', '[]', 805),
('influencer', 'How do you approach collaborations?', 'text', '[]', 806),
('influencer', 'What do brands get wrong about working with creators?', 'text', '[]', 807),
('influencer', 'Pick your ideal brand collab:', 'single_choice', '["Creative freedom, clear brief", "Long-term ambassador role", "One-off sponsored post", "Product gifting only", "Event/experience", "Co-creation of a product"]', 808),
('influencer', 'How do you measure content success?', 'text', '[]', 809),
('influencer', 'What''s the content you''re most proud of?', 'text', '[]', 810),
('influencer', 'How do you stay authentic while monetizing?', 'text', '[]', 811),
('influencer', 'What''s your ideal creative partner?', 'text', '[]', 812),
('influencer', 'How do you handle creative burnout?', 'text', '[]', 813),
('influencer', 'What role does photography/videography play in your content?', 'text', '[]', 814),
('influencer', 'Pick your content vibe:', 'single_choice', '["Polished and aspirational", "Raw and authentic", "Educational and informative", "Funny and relatable", "Artistic and curated", "Behind-the-scenes", "Storytelling-driven"]', 815),
('influencer', 'What do you want your audience to take away?', 'text', '[]', 816),
('influencer', 'How do you protect your mental health as a creator?', 'text', '[]', 817);

-- ============================================================
-- DONE. ~25 prompts per category, 9 categories = ~225 total prompts
-- ============================================================
