'use strict';
// Root hashes historically belonged to the Republic; preserve the complete URL state.
(() => {
  const forward = () => {
    if (/^#(?:year=|story=|stories(?:$|[&?]))/.test(location.hash)) {
      location.replace('republic/' + location.search + location.hash);
    }
  };
  forward();
  addEventListener('hashchange', forward);
})();
