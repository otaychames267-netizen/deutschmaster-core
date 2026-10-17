-- Training / evaluation data for the strict free grader: every essay graded by Claude Sonnet 5 with its task text.
-- Run through the Supabase Management API and save the JSON array as claude-gradings.json (see README).
select g.id, g.exam_item_id, g.word_count, g.model, g.task_achievement_score ta, g.communicative_design_score cd, g.formal_accuracy_score fa, g.overall_score total, g.passed,
       g.essay_text, g.feedback, i.content, e.metadata, e.level, g.created_at::date d
from essay_gradings g
left join exam_items i on i.id = g.exam_item_id
left join exams e on e.id = g.exam_id
where g.model = 'claude-sonnet-5'
order by g.created_at;
