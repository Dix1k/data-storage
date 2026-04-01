SELECT
    s.name               AS Специальность,
    COUNT(st.id)         AS Число_студентов
FROM 
    specialty AS s
    LEFT JOIN edu_group AS g 
        ON g.specialty_id = s.id
    LEFT JOIN student AS st 
        ON st.group_id = g.id
        AND st.status = N'Обучается'
GROUP BY 
    s.name
ORDER BY 
    Число_студентов DESC;
