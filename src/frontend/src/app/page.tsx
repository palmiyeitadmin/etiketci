export default function Home() {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="bg-white p-12 rounded-2xl shadow-xl max-w-2xl text-center space-y-6">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    Palmiye Label Management System <span className="text-blue-600">(PLMS)</span>
                </h1>
                <p className="text-lg text-gray-600">
                    The foundation of the Epson-only MVP is scaffolded.
                </p>
                <div className="flex flex-col gap-4 max-w-sm mx-auto mt-8">
                    <div className="bg-blue-50 text-blue-800 text-sm py-3 px-4 rounded-xl font-medium shadow-inner">
                        Epson CW-C4000e PDF Print Flow Ready
                    </div>
                    <div className="bg-gray-100 text-gray-800 text-sm py-3 px-4 rounded-xl font-medium shadow-inner">
                        .NET 8 Backend API Contracts Enforced
                    </div>
                    <div className="bg-gray-100 text-gray-800 text-sm py-3 px-4 rounded-xl font-medium shadow-inner">
                        Entra ID Authentication Placeholders Added
                    </div>
                </div>
            </div>
        </div>
    );
}
