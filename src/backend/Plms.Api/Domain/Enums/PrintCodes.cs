namespace Plms.Api.Domain.Enums
{
    /// <summary>Why a print failed. The UI shows its own wording for each code.</summary>
    public static class PrintFailureCategories
    {
        public const string PaperJam = "paper_jam";
        public const string Color = "color";
        public const string Alignment = "alignment";
        public const string Barcode = "barcode";
        public const string WrongData = "wrong_data";
        public const string PrinterError = "printer_error";
        public const string Other = "other";

        public static readonly string[] All = { PaperJam, Color, Alignment, Barcode, WrongData, PrinterError, Other };
    }

    /// <summary>Why labels are printed again. Reprints need a reason but no approval.</summary>
    public static class ReprintReasons
    {
        public const string Damaged = "damaged";
        public const string Lost = "lost";
        public const string Extra = "extra";
        public const string Other = "other";

        public static readonly string[] All = { Damaged, Lost, Extra, Other };
    }
}
