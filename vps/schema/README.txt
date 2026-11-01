001-init.sql must be applied once to an empty PostgreSQL database owned by the elia runtime role.
Never run an import against production while the old application can still write to Firebase.
Do NOT use credentials from the GU project. Make a dedicated PostgreSQL database and user.
