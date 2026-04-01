public class MergeSort {
    private static long comparisons = 0;

    public static SortResult sort(int[] array) {
        comparisons = 0;

        try {
            System.gc();
            Thread.sleep(50);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        long startMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long startTime = System.nanoTime();

        mergeSort(array, 0, array.length - 1);

        long endTime = System.nanoTime();
        long endMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        long elapsedTimeMs = (endTime - startTime) / 1_000_000;
        long memoryUsed = endMemory - startMemory;

        // В слиянии перестановок как таковых нет, только копирование, считаем swaps=0
        return new SortResult("MergeSort", array.length, comparisons, 0, elapsedTimeMs, memoryUsed);
    }

    private static void mergeSort(int[] array, int left, int right) {
        if (left < right) {
            int mid = (left + right) / 2;
            mergeSort(array, left, mid);
            mergeSort(array, mid + 1, right);
            merge(array, left, mid, right);
        }
    }

    private static void merge(int[] array, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;

        int[] leftArr = new int[n1];
        int[] rightArr = new int[n2];

        System.arraycopy(array, left, leftArr, 0, n1);
        System.arraycopy(array, mid + 1, rightArr, 0, n2);

        int i = 0, j = 0, k = left;

        while (i < n1 && j < n2) {
            comparisons++;
            if (leftArr[i] <= rightArr[j]) {
                array[k++] = leftArr[i++];
            } else {
                array[k++] = rightArr[j++];
            }
        }

        while (i < n1) {
            array[k++] = leftArr[i++];
        }

        while (j < n2) {
            array[k++] = rightArr[j++];
        }
    }
}
