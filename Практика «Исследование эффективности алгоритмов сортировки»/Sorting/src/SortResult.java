public class SortResult {
    public String algorithmName;
    public int arraySize;
    public long comparisons;
    public long swaps;
    public long timeMs;
    public long memoryBytes;

    public SortResult(String algorithmName, int arraySize, long comparisons, long swaps, long timeMs, long memoryBytes) {
        this.algorithmName = algorithmName;
        this.arraySize = arraySize;
        this.comparisons = comparisons;
        this.swaps = swaps;
        this.timeMs = timeMs;
        this.memoryBytes = memoryBytes;
    }
}
