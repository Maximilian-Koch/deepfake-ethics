-- This displays the average impact that the ethical consideration have on the user, depending on the design theme
SELECT
    design_theme,
    AVG(ethical_score - initial_ethical_score) AS average_consideration_impact,
    COUNT(*) AS number_of_exhibit_scores
FROM
    user_interactions
WHERE
    exhibit_id > 0 AND exhibit_id < 999 -- Only specific exhibit rows
    AND initial_ethical_score IS NOT NULL
    AND ethical_score IS NOT NULL
GROUP BY
    design_theme;