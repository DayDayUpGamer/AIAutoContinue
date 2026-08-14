/* global globalThis */
'use strict';

(function exposePublisherLink(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AIACPublisherLink = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const PUBLISHER_SITE_URL = 'https://muhook.com/';

  function getPublisherUrl(candidate = PUBLISHER_SITE_URL) {
    const parsed = new URL(candidate);

    if (parsed.protocol !== 'https:') throw new Error('publisher_url_requires_https');
    if (parsed.hostname !== 'muhook.com') throw new Error('publisher_host_not_allowed');
    if (parsed.port || parsed.username || parsed.password) throw new Error('publisher_url_credentials_or_port_not_allowed');
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('publisher_url_must_be_canonical');
    if (parsed.href !== PUBLISHER_SITE_URL) throw new Error('publisher_url_not_canonical');

    return PUBLISHER_SITE_URL;
  }

  return Object.freeze({
    PUBLISHER_SITE_URL,
    getPublisherUrl
  });
});
