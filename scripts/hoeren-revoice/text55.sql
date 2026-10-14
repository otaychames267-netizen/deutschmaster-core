-- 2026-10-14 owner "telccfree chouf": statement 55 of both Steiner variants was cut off / scrambled by the PDF import. telccfree.com (owner's own platform) has the full sentence
-- in the Original quiz: "Steiner rät Abiturienten dazu, verschiedene berufliche Möglichkeiten zu testen." (its modified quiz has the same words scrambled: "verschiedene testen zu Möglichkeit berufliche").
-- ROLLBACK:
--   update public.hoeren_statements set statement_text = 'Steiner rät Abiturienten dazu, verschiedene berufliche Möglichkeiten zu' where id = '8dc75374-7963-4d6d-a438-60f34dfddd5e';
--   update public.hoeren_statements set statement_text = 'Steiner rät Abiturienten dazu, verschiedene Tests zu Möglichkeit berufliche' where id = 'ed46d85b-55fe-4fb5-a6f2-05c5cd5d7964';
update public.hoeren_statements set statement_text = 'Steiner rät Abiturienten dazu, verschiedene berufliche Möglichkeiten zu testen.'
 where id in ('8dc75374-7963-4d6d-a438-60f34dfddd5e','ed46d85b-55fe-4fb5-a6f2-05c5cd5d7964');
