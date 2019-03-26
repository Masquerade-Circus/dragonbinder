/**
 * This method checks if a key exists in the object provided
 * @throws {Error} Throws an error if the key does not exists
 * @param {String} objectname The name of the object for log reference
 * @param {Object} object The object in which we will search
 * @param {Object} key The key to search for
 * @returns {Void} //
 */
function keyExists(objectname, object, key) {
  if (!object[key]) {
    throw new Error(`The ${objectname} "${key}" does not exists.`);
  }
}

/**
 * This method checks the provided callback is a function
 * @throws {Error} Throws an error if the callback is not a function
 * @param {String} type The type to use for log reference
 * @param {Object} callback The callback to check
 * @returns {Void} //
 */
function isFunction(type, callback) {
  if (typeof callback !== 'function') {
    throw new Error(`You need to provide a valid function as ${type}.`);
  }
}

/**
 * This is the Store entity
 * @param {Object} data The initial options to create the store
 * @param {Object} [data.state] Optional initial state for the store
 * @param {Object} [data.mutations] Optional mutation methods to update the state
 * @param {Object} [data.actions] Optional actions to handle async methods and update the state
 * @param {Object} [data.getters] Optional getters to read from the state
 * @returns {Object} new store object
 */
function Dragonbinder(data = {}) {
  let { state, getters } = data;

  /**
   * We will create a proxy for the state
   */
  this.state = new Proxy(state || {}, {

    /**
     * Every time we try to access a property from the state we try to deep freeze the property
     * to prevent direct modifications to the state
     * @param {Object} state The state object
     * @param {String} prop The property to read
     * @returns {Any} The property value
     */
    get: (state, prop) => {
      return this.deepFreeze(state[prop]);
    },

    /**
     * If the user tries to set directly it will throw an error, only if we have unfrozen the state via commit
     * this will proceed to set the value
     * @param {Object} state The state object
     * @param {String} prop The property to set
     * @param {Any} value The property value
     * @returns {Boolean} Always returns true
     */
    set: (state, prop, value) => {
      this.isUnfrozen();
      let old = state[prop];
      state[prop] = value;
      this.trigger('set', prop, value, old);
      return true;
    },

    /**
     * If the user tries to delete directly it will throw an error, only if we have unfrozen the state via commit
     * this will proceed to delete the property
     * @param {Object} state The state object
     * @param {String} prop The property to delete
     * @returns {Boolean} Always returns true
     */
    deleteProperty: (state, prop) => {
      this.isUnfrozen();
      let old = state[prop];
      delete state[prop];
      this.trigger('delete', prop, old);
      return true;
    }
  });

  /**
   * We will define a hidden property to store the init data
   */
  Object.defineProperty(this, 'init', {
    value: Object.assign({
      /**
       * This property will store the frozen state of the store
       */
      frozen: true,

      /**
       * This property will store the plugins
       */
      plugins: [],

      /**
       * This property will store the event listeners
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
        plugin: []
      }
    }, data)
  });

  /**
   * We create a proxy for the getters
   */
  this.getters = new Proxy(getters || {}, {

    /**
     * When we try to get a property of the getter we will call the orginal
     * getter method passing the state as first argument and the other getters as second
     * if we try to get a non existent getter it will fail silently as if
     * we were trying to get an undefined property
     * @param {Object} getters The getters object
     * @param {String} getter The name of the getter to read
     * @returns {Any} The value of the getter
     */
    get: (getters, getter) => {
      if (getters[getter]) {
        let value = getters[getter](this.state, this.getters);
        this.trigger('getter', getter, value);
        return value;
      }
    }
  });
}

Dragonbinder.prototype = Dragonbinder.fn = {

  /**
   * This method checks if the store is in a state able to mutate the state
   * @throws {Error} Throws an error if the store is frozen
   * @returns {Void} //
   */
  isUnfrozen() {
    if (this.init.frozen) {
      throw new Error('You need to commit a mutation to change the state');
    }
  },

  /**
   * This method is used to deep freeze an object
   * @param {Object} obj The object to freeze
   * @returns {Object} Object frozen
   */
  deepFreeze(obj) {
    // deep freeze object only if it isn't already frozen
    if (!Object.isFrozen(obj)) {
      Object.getOwnPropertyNames(obj).forEach(
        prop => typeof obj[prop] === 'object' && obj[prop] !== null && this.deepFreeze(obj[prop])
      );
      Object.freeze(obj);
    }

    return obj;
  },

  /**
   * This method unfroze the state and process a mutation
   * @throws This will trhow an error if the mutation does not exists
   * @param {String} mutation The mutation name to process
   * @param  {...any} args The arguments to pass to the mutation
   * @returns {Void} Void
   */
  commit(mutation, ...args) {
    keyExists('mutation', this.init.mutations, mutation);
    this.init.frozen = false;
    this.trigger('beforecommit', mutation, ...args);
    this.init.mutations[mutation](this.state, ...args);
    this.trigger('commit', mutation, ...args);
    this.init.frozen = true;
  },

  /**
   * This method process an action
   * @throws This will throw an error if the action does not exists
   * @param {String} action The action name to process
   * @param  {...any} args The arguments to pass to the action
   * @returns {Promise} The action call as a promise
   */
  dispatch(action, ...args) {
    keyExists('action', this.init.actions, action);
    this.trigger('beforedispatch', action, ...args);
    return Promise.resolve(this.init.actions[action](this, ...args)).then((result) => {
      this.trigger('dispatch', action, ...args);
      return result;
    });
  },

  /**
   * This method triggers an event
   * @param {String} event The event name to trigger
   * @param  {...any} args The arguments that will be passed to the listener
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
    isFunction('listener', listener);
    keyExists('event', this.init.listeners, event);
    if (this.init.listeners[event].indexOf(listener) === -1) {
      this.init.listeners[event].push(listener);
      this.trigger('addlistener', event, listener);
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
    isFunction('listener', listener);
    keyExists('event', this.init.listeners, event);
    let index = this.init.listeners[event].indexOf(listener);
    if (index > -1) {
      this.init.listeners[event].splice(index, 1);
      this.trigger('removelistener', event, listener);
    }
  },

  /**
   * This method adds a plugin to the Store
   * @throws This will throw an error if the plugin is not a function
   * @param {Function} plugin The plugin to add
   * @param {...any} options The options passed to the plugin
   * @returns {Void} Void
   */
  use(plugin, ...options) {
    isFunction('plugin', plugin);
    if (this.init.plugins.indexOf(plugin) === -1) {
      plugin(this, ...options);
      this.init.plugins.push(plugin);
      this.trigger('plugin', plugin, ...options);
    }
  }
};

Dragonbinder.fn = Dragonbinder.prototype;

if (typeof exports === 'object') {
  module.exports = Dragonbinder;
} else {
  (typeof window === 'undefined' ? global : window).Dragonbinder = Dragonbinder;
}
