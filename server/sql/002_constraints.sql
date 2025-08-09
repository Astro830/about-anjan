ALTER TABLE results
  ADD CONSTRAINT results_runner_event_unique UNIQUE (runner_id, event_id);