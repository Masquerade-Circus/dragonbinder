/**
 * This method is used to deep freeze an object
 * @param {Object} obj The object to freeze
 * @returns {Object} Object frozen
 */
function deepFreeze(obj) {
  if (typeof obj === "object" && obj !== null && !Object.isFrozen(obj)) {
    if (Array.isArray(obj)) {
      for (let i = 0, l = obj.length; i < l; i++) {
        deepFreeze(obj[i]);
      }
    } else {
      let props = Reflect.ownKeys(obj);
      for (let i = 0, l = props.length; i < l; i++) {
        deepFreeze(obj[props[i]]);
      }
    }
    Object.freeze(obj);
  }

  return obj;
}

/**
 * This is the Store entity
 *
 * @constructor
 * @param {Object} data The initial options to create the store
 * @param {Object} [data.state] Optional initial state for the store
 * @param {Object} [data.mutations] Optional mutation methods to update the state
 * @param {Object} [data.actions] Optional actions to handle async methods and update the state
 * @param {Object} [data.getters] Optional getters to read from the state
 * @param {Object} [data.modules] Optional modules to register to this store
 * @param {Boolean} [data.shouldFreeze=true] Whether to freeze the state
 * @returns {Object} new store object
 */
function Dragonbinder({
  state,
  mutations,
  actions,
  getters,
  modules,
  shouldFreeze = true,
  namespace,
  rootStore
} = {}) {
  // Initialize the localState for this store
  let localState = typeof state === "function" ? state() : state;

  /**
   * We create a proxy for the state
   * @type {Object}
   * @name Dragonbinder.state
   */
  this.state = new Proxy(localState || {}, {
    /**
     * Every time we try to access a property from the state we try to deep freeze the property
     * to prevent direct modifications to the state
     *
     * @type {Object}
     * @name Dragonbinder.state.get
     * @param {Object} state The state object
     * @param {String} prop The property to read
     * @returns {Any} The property value
     */
    get: (state, prop) => {
      if ((this.rootStore || this).init.modules[prop]) {
        return state[prop];
      }
      if (shouldFreeze) {
        return deepFreeze(state[prop]);
      }

      return state[prop];
    },

    /**
     * If the user tries to set directly it will throw an error, only if we have unfrozen the state via commit
     * this will proceed to set the value
     *
     * @type {Object}
     * @name Dragonbinder.state.set
     * @param {Object} state The state object
     * @param {String} prop The property to set
     * @param {Any} value The property value
     * @returns {Boolean} Always returns true
     */
    set: (state, prop, value) => {
      this.isUnfrozen();
      let old = state[prop];
      state[prop] = value;
      if (this.namespace) {
        prop = `${this.namespace}.${prop}`;
      }
      (this.rootStore || this).trigger("set", prop, value, old);
      return true;
    },

    /**
     * If the user tries to delete directly it will throw an error, only if we have unfrozen the state via commit
     * this will proceed to delete the property
     *
     * @type {Object}
     * @name Dragonbinder.state.deleteProperty
     * @param {Object} state The state object
     * @param {String} prop The property to delete
     * @returns {Boolean} Always returns true
     */
    deleteProperty: (state, prop) => {
      this.isUnfrozen();
      let old = state[prop];
      delete state[prop];
      if (this.namespace) {
        prop = `${this.namespace}.${prop}`;
      }
      (this.rootStore || this).trigger("delete", prop, old);
      return true;
    }
  });

  /**
   * We will define a hidden property to store the init data
   *
   * @type {Object}
   * @name Dragonbinder.init
   */
  Object.defineProperty(this, "init", {
    value: {
      /**
       * This property will store the frozen state of the store
       *
       * @type {Boolean}
       * @name Dragonbinder.init.frozen
       */
      frozen: true,

      /**
       * This property will store the plugins
       * @type {Array}
       * @name Dragonbinder.init.plugins
       */
      plugins: [],

      /**
       * This property will store the registered modules
       * @type {Object}
       * @name Dragonbinder.init.modules
       */
      modules: {},

      /**
       * This will have the initial child module namespace definitions
       * @type {Array}
       * @name Dragonbinder.init.childModuleNamespaces
       */
      childModuleNamespaces: Object.keys(modules || {}),

      /**
       * This property will store the event listeners
       * @type {Object}
       * @name Dragonbinder.init.listeners
       * @property {Array} listeners.set This will store the set event listeners
       * @property {Array} listeners.delete This will store the delete event listeners
       * @property {Array} listeners.beforecommit This will store the beforecommit event listeners
       * @property {Array} listeners.commit This will store the commit event listeners
       * @property {Array} listeners.beforedispatch This will store the beforedispatch event listeners
       * @property {Array} listeners.dispatch This will store the dispatch event listeners
       * @property {Array} listeners.getter This will store the getter event listeners
       * @property {Array} listeners.addlistener This will store the addlistener event listeners
       * @property {Array} listeners.removelistener This will store the removelistener event listeners
       * @property {Array} listeners.plugin This will store the plugin event listeners
       * @property {Array} listeners.registerModule This will store the registerModule event listeners
       * @property {Array} listeners.unregisterModule This will store the unregisterModule event listeners
       */
      listeners: {
        set: [],
        delete: [],
        beforecommit: [],
        commit: [],
        beforedispatch: [],
        dispatch: [],
        getter: [],
        addlistener: [],
        removelistener: [],
        plugin: [],
        registerModule: [],
        unregisterModule: []
      },

      /**
       * Set passed getters for future reference
       * @type {Object}
       * @name Dragonbinder.init.getters
       */
      getters: getters || {},

      /**
       * Set passed mutations for future reference
       * @type {Object}
       * @name Dragonbinder.init.mutations
       */
      mutations: mutations || {},
      /**
       * Set passed actions for future reference
       * @type {Object}
       * @name Dragonbinder.init.actions
       */
      actions: actions || {}
    }
  });

  /**
   * We create a proxy for the getters
   * @type {Object}
   * @name Dragonbinder.getters
   */
  this.getters = new Proxy(getters || {}, {
    /**
     * When we try to get a property of the getter we will call the original
     * getter method passing the state as first argument and the other getters as second
     * if we try to get a non existent getter it will fail silently as if
     * we were trying to get an undefined property
     *
     * @type {Function}
     * @name Dragonbinder.getters.get
     * @param {Object} getters The getters object
     * @param {String} getter The name of the getter to read
     * @returns {Any} The value of the getter
     */
    get: (getters, getter) => {
      try {
        let { store, key } = this.getStore(this, getter);

        if (store instanceof Dragonbinder && store.init.getters[key]) {
          let value = store.init.getters[key](
            store.state,
            store.getters,
            this.state,
            this.getters
          );
          if (this.namespace) {
            getter = `${this.namespace}.${getter}`;
          }
          (this.rootStore || this).trigger("getter", getter, value);
          return value;
        }
      } catch (error) {
        return;
      }
    }
  });

  /**
   * If this is a store been attached to another store
   * this will have the rootStore for future reference
   *
   * @type {(Dragonbinder|Null)}
   * @name Dragonbinder.rootStore
   */
  Object.defineProperty(this, "rootStore", {
    value: rootStore || null,
    enumerable: true
  });

  /**
   * If this is a store been attached to another store
   * this will have the namespace attached
   *
   * @type {(String|Null)}
   * @name Dragonbinder.namespace
   */
  Object.defineProperty(this, "namespace", {
    value: namespace || null,
    enumerable: true
  });

  /**
   * Finally we attach the initial modules
   */
  if (modules) {
    Object.keys(modules).forEach((namespace) => {
      let n = this.namespace ? `${this.namespace}.${namespace}` : namespace;
      (this.rootStore || this).registerModule(n, modules[namespace]);
    });
  }
}

Dragonbinder.prototype = Dragonbinder.fn = {
  /**
   * This method checks if a key exists in the object provided
   * @throws {Error} Throws an error if the key does not exists
   * @param {String} objectname The name of the object for log reference
   * @param {Object} object The object in which we will search
   * @param {Object} key The key to search for
   * @returns {Void} //
   */
  keyExists(objectname, object, key) {
    if (!object[key]) {
      throw new Error(`The ${objectname} "${key}" does not exists.`);
    }
  },

  /**
   * This method checks the provided callback is a function
   * @throws {Error} Throws an error if the callback is not a function
   * @param {String} type The type to use for log reference
   * @param {Object} callback The callback to check
   * @returns {Void} //
   */
  isFunction(type, callback) {
    if (typeof callback !== "function") {
      throw new Error(`You need to provide a valid function as ${type}.`);
    }
  },

  /**
   * Giving a dot based namespace this method will be used to find the module to be called
   * @param {Dragonbinder} store The store instance in which search for the namespaced module
   * @param {String} namespace The namespace to search
   * @returns {Object} {store, key} An object containing the found module as `store` and the final key as `key` property
   */
  getStore(store, namespace) {
    let key = namespace;

    if (key.indexOf(".") > -1) {
      let parts = key.split(".");
      key = parts.pop();
      let moduleName = parts.join(".");
      this.keyExists("module", store.init.modules, moduleName);
      store = store.init.modules[moduleName];
    }

    return {
      store,
      key
    };
  },

  /**
   * This method checks if the store is in a state able to mutate the state
   * @throws {Error} Throws an error if the store is frozen
   * @returns {Void} //
   */
  isUnfrozen() {
    if (this.init.frozen) {
      throw new Error("You need to commit a mutation to change the state");
    }
  },

  /**
   * This method unfroze the state and process a mutation
   * @throws This will trhow an error if the mutation does not exists
   * @param {String} mutation The mutation name to process
   * @param  {...any} [args] The arguments to pass to the mutation
   * @returns {Void} Void
   */
  commit(mutation, ...args) {
    let { store, key } = this.getStore(this, mutation);
    this.keyExists("mutation", store.init.mutations, key);

    store.init.frozen = false;
    this.trigger("beforecommit", mutation, ...args);
    store.init.mutations[key](store.state, ...args);
    this.trigger("commit", mutation, ...args);
    store.init.frozen = true;
  },

  /**
   * This method process an action
   * @throws This will throw an error if the action does not exists
   * @param {String} action The action name to process
   * @param  {...any} [args] The arguments to pass to the action
   * @returns {Promise} The action call as a promise
   */
  dispatch(action, ...args) {
    let { store, key } = this.getStore(this, action);
    this.keyExists("action", store.init.actions, key);

    store.init.frozen = false;
    this.trigger("beforedispatch", action, ...args);
    return Promise.resolve(store.init.actions[key](store, ...args)).then(
      (result) => {
        this.trigger("dispatch", action, ...args);
        return result;
      }
    );
  },

  /**
   * This method triggers an event
   * @param {String} event The event name to trigger
   * @param  {...any} [args] The arguments that will be passed to the listener
   * @returns {Void} Void
   */
  trigger(event, ...args) {
    this.init.listeners[event].forEach((callback) => callback(this, ...args));
  },

  /**
   * This method adds an event listener to the store
   * @throws This will throw an error if the listener is not a function
   * @throws This will throw an error if the event does not exists
   * @param {String} event The event to which to add the listener
   * @param {Function} listener The listener to add
   * @returns {Function} The function to unsubscribe
   */
  on(event, listener) {
    this.isFunction("listener", listener);
    this.keyExists("event", this.init.listeners, event);
    if (this.init.listeners[event].indexOf(listener) === -1) {
      this.init.listeners[event].push(listener);
      this.trigger("addlistener", event, listener);
    }

    return () => this.off(event, listener);
  },

  /**
   * This method removes an event listener from the store
   * @throws This will throw an error if the listener is not a function
   * @throws This will throw an error if the event does not exists
   * @param {String} event The event to which to remove the listener
   * @param {Function} listener The listener to remove
   * @returns {Void} Void
   */
  off(event, listener) {
    this.isFunction("listener", listener);
    this.keyExists("event", this.init.listeners, event);
    let index = this.init.listeners[event].indexOf(listener);
    if (index > -1) {
      this.init.listeners[event].splice(index, 1);
      this.trigger("removelistener", event, listener);
    }
  },

  /**
   * This method adds a plugin to the Store
   * @throws This will throw an error if the plugin is not a function
   * @param {Function} plugin The plugin to add
   * @param {...any} [options] The options passed to the plugin
   * @returns {Void} Void
   */
  use(plugin, ...options) {
    this.isFunction("plugin", plugin);
    if (this.init.plugins.indexOf(plugin) === -1) {
      plugin(this, ...options);
      this.init.plugins.push(plugin);
      this.trigger("plugin", plugin, ...options);
    }
  },

  /**
   * This method adds a module to the store
   * @param {String} namespace The namespace to attach the module
   * @param {Object} module The module definition
   * @returns {Void} Void
   */
  registerModule(namespace, module) {
    let rootStore = this;

    if (rootStore.init.modules[namespace]) {
      throw new Error(
        `A module with the namespace "${namespace}" is already registered.`
      );
    }

    let newStore = new Dragonbinder(
      Object.assign({ rootStore, namespace }, module)
    );

    rootStore.init.frozen = false;
    rootStore.init.modules[namespace] = newStore;
    rootStore.state[namespace] = newStore.state;
    rootStore.init.frozen = true;
    rootStore.trigger("registerModule", namespace, module, newStore);
  },

  /**
   * This method removes a module from the store
   * @param {String} namespace The namespace of the attached module
   * @returns {Void} Void
   */
  unregisterModule(namespace) {
    let rootStore = this;
    let store = rootStore.init.modules[namespace];

    if (store) {
      store.init.childModuleNamespaces.forEach((n) =>
        rootStore.unregisterModule(`${namespace}.${n}`)
      );

      rootStore.init.frozen = false;
      delete rootStore.init.modules[namespace];
      delete rootStore.state[namespace];
      rootStore.init.frozen = true;
      rootStore.trigger("unregisterModule", namespace, store);
    }
  }
};

Dragonbinder.fn = Dragonbinder.prototype;

if (typeof exports === "object") {
  module.exports = Dragonbinder;
} else {
  (typeof window === "undefined" ? global : window).Dragonbinder = Dragonbinder;
}
