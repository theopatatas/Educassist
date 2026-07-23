"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasErrorName = hasErrorName;
exports.getErrorFieldNames = getErrorFieldNames;
function errorShape(error) {
    return typeof error === "object" && error !== null
        ? error
        : null;
}
function hasErrorName(error, expectedName) {
    return errorShape(error)?.name === expectedName;
}
function getErrorFieldNames(error) {
    const fields = errorShape(error)?.fields;
    return typeof fields === "object" && fields !== null
        ? Object.keys(fields)
        : [];
}
