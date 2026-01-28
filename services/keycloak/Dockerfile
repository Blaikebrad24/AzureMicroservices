FROM quay.io/keycloak/keycloak:26.0

# Copy realm configuration for auto-import
COPY realm/app-realm.json /opt/keycloak/data/import/app-realm.json

# Start in development mode with realm import
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--import-realm"]
