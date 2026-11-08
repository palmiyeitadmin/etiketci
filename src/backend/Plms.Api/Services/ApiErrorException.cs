namespace Plms.Api.Services
{
    /// <summary>
    /// A rule violation a service reports to the API caller: an English message plus the stable code
    /// (and values) the UI translates. Controllers turn it into a response with <c>ApiError.From</c>.
    /// Derives from <see cref="InvalidOperationException"/> so existing catch blocks keep working.
    /// </summary>
    public class ApiErrorException : InvalidOperationException
    {
        public ApiErrorException(string code, string message, IReadOnlyDictionary<string, string>? parameters = null)
            : base(message)
        {
            Code = code;
            Params = parameters ?? new Dictionary<string, string>();
        }

        public string Code { get; }

        public IReadOnlyDictionary<string, string> Params { get; }
    }
}
