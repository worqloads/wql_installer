module.exports = {
    apps: [
        {
            name: "scaler_collect",
            script: "./scaler_collect_min.js",
            max_memory_restart: "120M",
            env: { NODE_ENV: "production" },
            env_production: { NODE_ENV: "production" }
        },
        {
            name: "scaler_scale",
            script: "./scaler_scale_min.js",
            max_memory_restart: "120M",
            env: { NODE_ENV: "production" },
            env_production: { NODE_ENV: "production" }
        },
        {
            name: "scaler_sync",
            script: "./scaler_sync_min.js",
            max_memory_restart: "120M",
            env: { NODE_ENV: "production" },
            env_production: { NODE_ENV: "production" }
        },
        {
            name: "scaler_mon",
            script: "./scaler_mon_min.js",
            max_memory_restart: "70M",
            env: { NODE_ENV: "production" },
            env_production: { NODE_ENV: "production" }
        },
        {
            name: "scaler_update",
            script: "./scaler_update_min.js",
            max_memory_restart: "70M",
            env: { NODE_ENV: "production" },
            env_production: { NODE_ENV: "production" }
        }
    ]
}