-- Предположим, что мы знаем ID группы или её название
-- Вариант по названию группы:
SELECT
    st.full_name     AS ФИО,
    st.student_id    AS Номер_зачётки,
    st.status        AS Статус
FROM
    student AS st
    INNER JOIN edu_group AS g 
        ON st.group_id = g.id
WHERE
    g.name = N'ПИНб-21'
ORDER BY
    st.full_name;
