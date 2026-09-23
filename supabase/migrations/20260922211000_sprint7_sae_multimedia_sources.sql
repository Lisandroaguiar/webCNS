insert into public.data_sources (key, name, source_type, index_url, current_resource_url, parser_key)
values
  ('sae-multimedia-2026-annual-first', 'SAE — Multimedia 2026, anuales y primer cuatrimestre', 'course_schedule',
   'https://docs.google.com/spreadsheets/d/1WfwHuTD1_TIRlkZfbJYOTIBBwb67KSR0TqjAGB_4LXM/edit?gid=1473551857',
   'https://docs.google.com/spreadsheets/d/1WfwHuTD1_TIRlkZfbJYOTIBBwb67KSR0TqjAGB_4LXM/export?format=csv&gid=1473551857', 'sae-multimedia-annual-first'),
  ('sae-multimedia-2026-second', 'SAE — Multimedia 2026, segundo cuatrimestre', 'course_schedule',
   'https://docs.google.com/spreadsheets/d/16IWYR44P0Q8GHiP036jsDFpp_FXuv4kZbuu2IXHnvR4/edit?gid=1473551857',
   'https://docs.google.com/spreadsheets/d/16IWYR44P0Q8GHiP036jsDFpp_FXuv4kZbuu2IXHnvR4/export?format=csv&gid=1473551857', 'sae-multimedia-second')
on conflict (key) do update set
  name = excluded.name,
  index_url = excluded.index_url,
  current_resource_url = excluded.current_resource_url,
  parser_key = excluded.parser_key;
