-- Migration: add consumed_before to projects
-- For projects already running before adopting PM_Eye.
-- Run this in Supabase SQL Editor.

alter table public.projects
  add column if not exists consumed_before numeric not null default 0;

comment on column public.projects.consumed_before is
  'Số tiền đã tiêu trước khi bắt đầu dùng PM_Eye. Dashboard cộng vào totalSpent.';
