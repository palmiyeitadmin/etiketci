export interface Vendor {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
}

export interface ProductCategory {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
}

export interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    categoryId?: string;
    vendorId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    categoryName?: string;
    vendorName?: string;
}

export interface CsvImportReport {
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: RowValidationError[];
}

export interface RowValidationError {
    rowNumber: number;
    sku: string;
    errorType: string;
    message: string;
}
