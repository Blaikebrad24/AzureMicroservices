FROM quay.io/keycloak/keycloak:26.0

# Copy realm configuration for auto-import
# The import directory must be traversable (exec bit) by the keycloak user
USER root
RUN mkdir -p /opt/keycloak/data/import && chown keycloak:keycloak /opt/keycloak/data/import
USER keycloak
COPY --chown=keycloak:keycloak realm/app-realm.json /opt/keycloak/data/import/app-realm.json

# Start in development mode with realm import
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--import-realm"]
