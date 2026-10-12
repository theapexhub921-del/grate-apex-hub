-- Allow every appearance theme offered by the app to sync to user_preferences.
alter table public.user_preferences
  drop constraint if exists user_preferences_appearance_check;

alter table public.user_preferences
  add constraint user_preferences_appearance_check
  check (appearance in ('apex', 'light', 'dark', 'system', 'violet', 'black', 'pink', 'emerald'));