public class BubbleSort {
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

        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                comparisons++;
                if (array[j] > array[j + 1]) {
                    int temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                    swaps++;
                }
            }
        }

        long endTime = System.nanoTime();
        long endMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        long elapsedTimeMs = (endTime - startTime) / 1_000_000;
        long memoryUsed = endMemory - startMemory;

        return new SortResult("BubbleSort", n, comparisons, swaps, elapsedTimeMs, memoryUsed);
    }
}
