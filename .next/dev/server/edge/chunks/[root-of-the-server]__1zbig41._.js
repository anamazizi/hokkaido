(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push(["chunks/[root-of-the-server]__1zbig41._.js",
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
;
;
async function middleware(req) {
    try {
        const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://thfklgjldtdohuugjins.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZmtsZ2psZHRkb2h1dWdqaW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Mjk4NjAsImV4cCI6MjEwNTEwNTg2MH0.4TELKXDZbbpGYZfEBSZ5Bz_LkGPg_uL8j_h96YVrl8o"), {
            cookies: {
                getAll () {
                    return req.cookies.getAll();
                },
                setAll (cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options })=>{
                        res.cookies.set(name, value, options);
                    });
                }
            }
        });
        const { data: { session } } = await supabase.auth.getSession();
        const pathname = req.nextUrl.pathname;
        // Protect /urus routes - redirect to login if no session
        if (pathname.startsWith('/urus') && !session) {
            // If already on login page, do nothing
            if (pathname === '/urus/login') {
                return res;
            }
            const redirectUrl = new URL('/urus/login', req.url);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl);
        }
        // If session exists and user tries to access login page, redirect to dashboard
        if (session && pathname === '/urus/login') {
            const redirectUrl = new URL('/urus', req.url);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl);
        }
        // RBAC: If session exists and user is accessing /urus (not login), check role
        if (session && pathname.startsWith('/urus') && pathname !== '/urus/login') {
            try {
                // Fetch user profile from user_profiles table
                const { data: profile, error } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single();
                // If error or profile not found, treat as 'user' role (default)
                const userRole = profile?.role || 'user';
                // If user has 'user' role, redirect to home page
                if (userRole === 'user') {
                    const redirectUrl = new URL('/', req.url);
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirectUrl);
                }
            // Allow 'staff' and 'admin' roles to proceed
            } catch (error) {
                console.error('Error fetching user profile in middleware:', error);
            // Graceful fallback: allow access (let client-side handle)
            }
        }
        return res;
    } catch (error) {
        // Graceful fallback to avoid 500 crash if any auth or middleware invocation fails
        console.error('Middleware error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
}
const config = {
    matcher: [
        '/urus/:path*'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__1zbig41._.js.map