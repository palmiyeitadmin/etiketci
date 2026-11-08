using QuestPDF.Drawing;

namespace Plms.Api.Services
{
    /// <summary>
    /// Fonts bundled with the API (Assets/Fonts) and registered under the family names the editor offers.
    /// Without them the PDF falls back to whatever the server has installed, so labels would look
    /// different per machine and Turkish characters could go missing.
    /// Liberation fonts are metric-compatible with Arial, Times New Roman and Courier New (same widths),
    /// DejaVu Sans is close to Verdana. Licenses: Assets/Fonts/LICENSE-*.txt (SIL OFL 1.1, Bitstream Vera).
    /// </summary>
    public static class LabelFonts
    {
        public const string DefaultFamily = "Arial";

        private static readonly (string Family, string File)[] Bundled =
        {
            ("Arial", "LiberationSans-Regular.ttf"),
            ("Arial", "LiberationSans-Bold.ttf"),
            ("Arial", "LiberationSans-Italic.ttf"),
            ("Arial", "LiberationSans-BoldItalic.ttf"),
            ("Times New Roman", "LiberationSerif-Regular.ttf"),
            ("Times New Roman", "LiberationSerif-Bold.ttf"),
            ("Courier New", "LiberationMono-Regular.ttf"),
            ("Courier New", "LiberationMono-Bold.ttf"),
            ("Verdana", "DejaVuSans.ttf"),
            ("Verdana", "DejaVuSans-Bold.ttf"),
        };

        private static readonly object Gate = new();
        private static bool _registered;

        public static IReadOnlyCollection<string> Families { get; } =
            Bundled.Select(font => font.Family).Distinct().ToArray();

        /// <summary>Registers the bundled fonts once per process. Safe to call from every render.</summary>
        public static void EnsureRegistered()
        {
            if (_registered)
            {
                return;
            }

            lock (Gate)
            {
                if (_registered)
                {
                    return;
                }

                var directory = Path.Combine(AppContext.BaseDirectory, "Assets", "Fonts");
                foreach (var (family, file) in Bundled)
                {
                    var path = Path.Combine(directory, file);
                    if (!File.Exists(path))
                    {
                        throw new FileNotFoundException($"Bundled label font is missing: {path}");
                    }

                    using var stream = File.OpenRead(path);
                    FontManager.RegisterFontWithCustomName(family, stream);
                }

                _registered = true;
            }
        }

        /// <summary>Maps an element font to a bundled family; unknown names fall back to Arial.</summary>
        public static string Resolve(string? requested)
        {
            if (string.IsNullOrWhiteSpace(requested))
            {
                return DefaultFamily;
            }

            var match = Families.FirstOrDefault(family => string.Equals(family, requested.Trim(), StringComparison.OrdinalIgnoreCase));
            return match ?? DefaultFamily;
        }
    }
}
