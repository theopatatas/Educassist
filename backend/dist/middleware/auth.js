"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.requireAuth = void 0;
var auth_middleware_1 = require("./auth.middleware");
Object.defineProperty(exports, "requireAuth", { enumerable: true, get: function () { return auth_middleware_1.requireAuth; } });
var auth_middleware_2 = require("./auth.middleware");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(auth_middleware_2).default; } });
