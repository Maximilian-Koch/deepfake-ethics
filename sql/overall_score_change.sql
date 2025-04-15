--how much does the overall score change across themes?
SELECT
    design_theme,
    AVG(final_overall_score - initial_overall_score) AS average_overall_score_change,
    COUNT(*) AS number_of_sessions
FROM (
    SELECT
        session_id,
        design_theme,
        MAX(CASE WHEN exhibit_id = -999 THEN ethical_score END) AS initial_overall_score,
        MAX(CASE WHEN exhibit_id = 999 THEN ethical_score END) AS final_overall_score
    FROM
        user_interactions
    WHERE
        exhibit_id IN (-999, 999)
    GROUP BY
        session_id,
        design_theme
) AS overall_scores
WHERE
    initial_overall_score IS NOT NULL
    AND final_overall_score IS NOT NULL
GROUP BY
    design_theme;
