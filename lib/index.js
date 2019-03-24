function deepFreeze(obj) {
  if (!Object.isFrozen(obj)) {
    Object.getOwnPropertyNames(obj).forEach(prop => typeof prop === 'object' && prop !== null && deepFreeze(prop));
    Object.freeze(obj);
  }

  return obj;
}

function createStore({ state, mutations, actions, getters }) {
  let frozen = true;
  let handlers = [];

  function isUnfrozen() {
    if (frozen) {
      throw new Error('You need to commit a mutation to change the state');
    }
    return true;
  }

  function keyExists(type, object, key) {
    if (!object[key]) {
      throw new Error(`The ${type} "${key}" does not exists.`);
    }

    return true;
  }

  function isFunction(type, callback) {
    if (typeof callback !== 'function') {
      throw new Error(`You need to provide a valid function to ${type}.`);
    }
    return true;
  }

  let store = {
    state: new Proxy(state || {}, {
      get(state, prop) {
        return deepFreeze(state[prop]);
      },
      set(state, prop, value) {
        if (isUnfrozen()) {
          let old = state[prop];
          state[prop] = value;
          handlers.forEach((callback) => callback(store.state, prop, value, old));
        }

        return true;
      },
      deleteProperty(state, prop) {
        if (isUnfrozen()) {
          delete state[prop];
        }
        return true;
      }
    }),
    commit(mutation, ...args) {
      if (keyExists('mutation', mutations, mutation)) {
        frozen = false;
        args.unshift(store.state);
        mutations[mutation].apply(store, args);
        frozen = true;
      }
    },
    dispatch(action, ...args) {
      args.unshift(store);
      return Promise.resolve(keyExists('action', actions, action) ? actions[action].apply(store, args) : undefined);
    },
    getters: new Proxy(getters || {}, {
      get(getters, getter) {
        return getters[getter] && getters[getter](store.state, store.getters);
      }
    }),
    subscribe(handler) {
      if (isFunction('subscribe', handler) && handlers.indexOf(handler) === -1) {
        handlers.push(handler);
      }

      return () => store.unsubscribe(handler);
    },
    unsubscribe(handler) {
      if (isFunction('unsubscribe', handler)) {
        let index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  };

  return store;
}

if (typeof exports === 'object') {
  module.exports = createStore;
} else {
  (typeof window === 'undefined' ? global : window).Store = createStore;
}
