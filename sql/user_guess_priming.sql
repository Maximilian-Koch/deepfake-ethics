--what is the influence of the theme on how often users guess real/fake for the exhibits?
SELECT
    design_theme,
    user_guess,
    COUNT(*) AS count_of_guesses
FROM
    user_interactions
WHERE
    exhibit_id > 0 AND exhibit_id < 999
    AND user_guess IS NOT NULL
GROUP BY
    design_theme,
    user_guess
ORDER BY
    design_theme,
    user_guess;
