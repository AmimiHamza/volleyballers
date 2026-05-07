from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    # Bind to all interfaces so the server is reachable regardless of which LAN IP is current.
    # Frontend reads SERVER_HOST from shared/config.json to know which IP to call.
    socketio.run(
        app,
        host="0.0.0.0",
        port=app.config["SERVER_PORT"],
        debug=True,
        allow_unsafe_werkzeug=True,
    )
