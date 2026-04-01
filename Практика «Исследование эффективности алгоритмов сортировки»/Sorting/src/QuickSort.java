public class QuickSort {
    private static long comparisons = 0;
    private static long swaps = 0;

    public static SortResult sort(int[] array) {
        comparisons = 0;
        swaps = 0;

        try {
            System.gc();
            Thread.sleep(50);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        long startMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long startTime = System.nanoTime();

        quickSort(array, 0, array.length - 1);

        long endTime = System.nanoTime();
        long endMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        long elapsedTimeMs = (endTime - startTime) / 1_000_000;
        long memoryUsed = endMemory - startMemory;

        return new SortResult("QuickSort", array.length, comparisons, swaps, elapsedTimeMs, memoryUsed);
    }

    private static void quickSort(int[] array, int low, int high) {
        if (low < high) {
            int pi = partition(array, low, high);
            quickSort(array, low, pi - 1);
            quickSort(array, pi + 1, high);
        }
    }

    private static int partition(int[] array, int low, int high) {
        int pivot = array[high];
        int i = low - 1;

        for (int j = low; j < high; j++) {
            comparisons++;
            if (array[j] <= pivot) {
                i++;
                swap(array, i, j);
            }
        }
        swap(array, i + 1, high);
        return i + 1;
    }

    private static void swap(int[] array, int i, int j) {
        swaps++;
        int temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
