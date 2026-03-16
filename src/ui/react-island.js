(() => {
  function mountReactIsland() {
    const rootEl = document.getElementById('react-root');
    if (!rootEl) return;

    const ReactGlobal = window.React;
    const ReactDOMGlobal = window.ReactDOM;
    if (!ReactGlobal || !ReactDOMGlobal) {
      // React not loaded (or blocked). Do nothing to avoid disturbing existing UI.
      return;
    }

    const React = ReactGlobal;
    const ReactDOM = ReactDOMGlobal;

    function ReactIsland() {
      // Intentionally render nothing for now.
      // This keeps React wired in without changing the UI/UX until you add real components.
      return null;
    }

    const root = ReactDOM.createRoot ? ReactDOM.createRoot(rootEl) : null;
    if (root) {
      root.render(React.createElement(ReactIsland));
    } else if (ReactDOM.render) {
      ReactDOM.render(React.createElement(ReactIsland), rootEl);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountReactIsland, { once: true });
  } else {
    mountReactIsland();
  }
})();

