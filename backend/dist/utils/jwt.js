"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
// src/utils/jwt.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function mustGetEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`${name} is missing in environment variables`);
    return v;
}
const ACCESS_SECRET = mustGetEnv("JWT_ACCESS_SECRET");
const REFRESH_SECRET = mustGetEnv("JWT_REFRESH_SECRET");
// ✅ Fix: cast env strings to the expiresIn type jsonwebtoken expects
const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m");
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d");
function signAccessToken(payload) {
    const options = { expiresIn: ACCESS_EXPIRES_IN };
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, options);
}
function signRefreshToken(payload) {
    const options = { expiresIn: REFRESH_EXPIRES_IN };
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, options);
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
