namespace Plms.Api.DTOs.Search
{
    public class SearchItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Href { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Badge { get; set; }
    }

    public class SearchGroupDto
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public List<SearchItemDto> Items { get; set; } = new();
    }

    public class GlobalSearchResponseDto
    {
        public List<SearchGroupDto> Groups { get; set; } = new();
    }
}
