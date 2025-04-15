--See if the initial score (before considerations) or final score (after considerations)
--for exhibits differed based on whether the user guessed 'fake' or 'real',
--and by the theme

SELECT
    design_theme,
    user_guess,
    COUNT(*) as interaction_count,
    AVG(initial_ethical_score) AS avg_initial_score_for_guess,
    AVG(ethical_score) AS avg_final_score_for_guess
FROM
    user_interactions
WHERE
    exhibit_id > 0 AND exhibit_id < 999
    AND user_guess IS NOT NULL
    AND initial_ethical_score IS NOT NULL
    AND ethical_score IS NOT NULL
GROUP BY
    design_theme,
    user_guess
ORDER BY
    design_theme,
    user_guess;
