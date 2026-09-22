"use client";
import { useState, useCallback } from "react";
import type { CommunityGroup, CommunityEvent, ForumPost } from "../components/types";

export function useCommunityState() {
  const [commTab, setCommTab] = useState<"groups" | "events">("groups");
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", category: "", isNsfw: false });
  const [eventForm, setEventForm] = useState({ title: "", description: "", date: "", location: "" });
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [eventAttendees, setEventAttendees] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [forumPage, setForumPage] = useState(1);
  const [forumHasMore, setForumHasMore] = useState(true);
  const [forumSort, setForumSort] = useState<"hot" | "new" | "top">("hot");
  const [forumCategory, setForumCategory] = useState<string>("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const setGroupFormField = useCallback((field: string, value: any) => {
    setGroupForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const setEventFormField = useCallback((field: string, value: any) => {
    setEventForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetGroupForm = useCallback(() => {
    setGroupForm({ name: "", description: "", category: "", isNsfw: false });
  }, []);

  const resetEventForm = useCallback(() => {
    setEventForm({ title: "", description: "", date: "", location: "" });
  }, []);

  return {
    commTab, setCommTab,
    groups, setGroups,
    events, setEvents,
    groupLoading, setGroupLoading,
    eventLoading, setEventLoading,
    groupError, setGroupError,
    eventError, setEventError,
    showCreateGroup, setShowCreateGroup,
    showCreateEvent, setShowCreateEvent,
    groupForm, setGroupForm, setGroupFormField, resetGroupForm,
    eventForm, setEventForm, setEventFormField, resetEventForm,
    selectedGroup, setSelectedGroup,
    selectedEvent, setSelectedEvent,
    groupMembers, setGroupMembers,
    eventAttendees, setEventAttendees,
    forumPosts, setForumPosts,
    forumLoading, setForumLoading,
    forumPage, setForumPage,
    forumHasMore, setForumHasMore,
    forumSort, setForumSort,
    forumCategory, setForumCategory,
    newPostTitle, setNewPostTitle,
    newPostBody, setNewPostBody,
    expandedPost, setExpandedPost,
    commentText, setCommentText,
    replyingTo, setReplyingTo,
  };
}