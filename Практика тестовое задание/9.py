import pandas as pd
from pandas_ods_reader import read_ods

path = "9.ods"

def solve_task(path):
    df = read_ods(path, headers=False)
    
    count = 0
    
    for index, row in df.iterrows():
        numbers = row.iloc[:4].tolist()

        numbers = [int(x) for x in numbers]
        numbers.sort()

        max_num = numbers[3]
        sum_of_three = numbers[0] + numbers[1] + numbers[2]
        
        condition1 = max_num < sum_of_three

        pair_sums = []
        for i in range(4):
            for j in range(i+1, 4):
                pair_sums.append(numbers[i] + numbers[j])
        
        can_split = False
        
        pairs_combinations = [
            [(0,1), (2,3)],
            [(0,2), (1,3)],
            [(0,3), (1,2)]
        ]
        
        for pairs in pairs_combinations:
            sum1 = numbers[pairs[0][0]] + numbers[pairs[0][1]]
            sum2 = numbers[pairs[1][0]] + numbers[pairs[1][1]]
            if sum1 == sum2:
                can_split = True
                break
        
        condition2 = not can_split

        if condition1 and condition2:
            count += 1
    
    return count

result = solve_task(path)
print(f"Количество строк, удовлетворяющих условиям: {result}")