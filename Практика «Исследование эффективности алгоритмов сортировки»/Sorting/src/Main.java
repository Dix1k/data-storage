import java.util.*;
import java.io.File;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.ChartUtils;
import org.jfree.data.category.DefaultCategoryDataset;

public class Main {
    public static void main(String[] args) throws Exception {
        System.out.printf("%-15s %-10s %-15s %-15s %-15s %-15s%n",
                "Алгоритм", "Размер", "Сравнений", "Перестановок", "Время (мс)", "Память (байт)");

        Random random = new Random();

        // Для хранения данных времени: алгоритм -> (размер массива -> время)
        Map<String, Map<Integer, Long>> timeData = new HashMap<>();
        String[] algorithms = {"Пузырьковая", "Вставками", "Быстрая", "Слиянием"};
        for (String alg : algorithms) {
            timeData.put(alg, new LinkedHashMap<>());
        }

        for (int size = 2000; size <= 20000; size += 2000) {
            int[] array = new int[size];
            for (int i = 0; i < size; i++) {
                array[i] = random.nextInt(100_000);
            }

            int[] arrayForBubble = Arrays.copyOf(array, array.length);
            int[] arrayForInsertion = Arrays.copyOf(array, array.length);
            int[] arrayForQuick = Arrays.copyOf(array, array.length);
            int[] arrayForMerge = Arrays.copyOf(array, array.length);

            SortResult bubbleRes = BubbleSort.sort(arrayForBubble);
            bubbleRes.algorithmName = "Пузырьковая";
            SortResult insertionRes = InsertionSort.sort(arrayForInsertion);
            insertionRes.algorithmName = "Вставками";
            SortResult quickRes = QuickSort.sort(arrayForQuick);
            quickRes.algorithmName = "Быстрая";
            SortResult mergeRes = MergeSort.sort(arrayForMerge);
            mergeRes.algorithmName = "Слиянием";

            printResult(bubbleRes);
            printResult(insertionRes);
            printResult(quickRes);
            printResult(mergeRes);
            System.out.println("--------------------------------------------------------------------------------");

            // Сохраняем время для графика
            timeData.get(bubbleRes.algorithmName).put(size, bubbleRes.timeMs);
            timeData.get(insertionRes.algorithmName).put(size, insertionRes.timeMs);
            timeData.get(quickRes.algorithmName).put(size, quickRes.timeMs);
            timeData.get(mergeRes.algorithmName).put(size, mergeRes.timeMs);
        }

        createChart(timeData, "Сравнение алгоритмов сортировки", "Размер массива", "Время (мс)", "sort_performance.png");
        System.out.println("График сохранён в sort_performance.png");
    }

    private static void printResult(SortResult res) {
        System.out.printf("%-15s %-10d %-15d %-15d %-15d %-15d%n",
                res.algorithmName,
                res.arraySize,
                res.comparisons,
                res.swaps,
                res.timeMs,
                res.memoryBytes);
    }

    private static void createChart(Map<String, Map<Integer, Long>> timeData, String chartTitle,
                                    String xAxisLabel, String yAxisLabel, String fileName) throws Exception {

        DefaultCategoryDataset dataset = new DefaultCategoryDataset();

        for (var algEntry : timeData.entrySet()) {
            String algorithm = algEntry.getKey();
            for (var sizeEntry : algEntry.getValue().entrySet()) {
                Integer size = sizeEntry.getKey();
                Long time = sizeEntry.getValue();
                dataset.addValue(time, algorithm, size);
            }
        }

        JFreeChart lineChart = ChartFactory.createLineChart(
                chartTitle,
                xAxisLabel,
                yAxisLabel,
                dataset
        );

        int width = 800;
        int height = 600;
        File chartFile = new File(fileName);
        ChartUtils.saveChartAsPNG(chartFile, lineChart, width, height);
    }
}
