import config from "../../../shared/config.json";

const { host, port, protocol } = config.server;
const portPart = port === 80 || port === 443 ? "" : `:${port}`;

export const API_BASE_URL = `${protocol}://${host}${portPart}/api`;
