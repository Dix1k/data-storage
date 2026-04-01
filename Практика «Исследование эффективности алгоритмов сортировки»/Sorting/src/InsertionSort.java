public class InsertionSort {
    public static SortResult sort(int[] array) {
        int n = array.length;
        long comparisons = 0;
        long swaps = 0;

        try {
            System.gc();
            Thread.sleep(50);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        long startMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long startTime = System.nanoTime();

        for (int i = 1; i < n; i++) {
            int key = array[i];
            int j = i - 1;

            while (j >= 0 && array[j] > key) {
                comparisons++;
                array[j + 1] = array[j];
                swaps++;
                j--;
            }
            if (j >= 0) comparisons++; // Последнее сравнение, когда условие не прошло

            array[j + 1] = key;
        }

        long endTime = System.nanoTime();
        long endMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        long elapsedTimeMs = (endTime - startTime) / 1_000_000;
        long memoryUsed = endMemory - startMemory;

        return new SortResult("InsertionSort", n, comparisons, swaps, elapsedTimeMs, memoryUsed);
    }
}
