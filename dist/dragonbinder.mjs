var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/index.js
var require_lib = __commonJS({
  "lib/index.js"(exports, module) {
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
      let localState = typeof state === "function" ? state() : state;
      this.state = new Proxy(localState || {}, {
        get: (state2, prop) => {
          if ((this.rootStore || this).init.modules[prop]) {
            return state2[prop];
          }
          if (shouldFreeze) {
            return deepFreeze(state2[prop]);
          }
          return state2[prop];
        },
        set: (state2, prop, value) => {
          this.isUnfrozen();
          let old = state2[prop];
          state2[prop] = value;
          if (this.namespace) {
            prop = `${this.namespace}.${prop}`;
          }
          (this.rootStore || this).trigger("set", prop, value, old);
          return true;
        },
        deleteProperty: (state2, prop) => {
          this.isUnfrozen();
          let old = state2[prop];
          delete state2[prop];
          if (this.namespace) {
            prop = `${this.namespace}.${prop}`;
          }
          (this.rootStore || this).trigger("delete", prop, old);
          return true;
        }
      });
      Object.defineProperty(this, "init", {
        value: {
          frozen: true,
          plugins: [],
          modules: {},
          childModuleNamespaces: Object.keys(modules || {}),
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
          getters: getters || {},
          mutations: mutations || {},
          actions: actions || {}
        }
      });
      this.getters = new Proxy(getters || {}, {
        get: (getters2, getter) => {
          try {
            let { store, key } = this.getStore(this, getter);
            if (store instanceof Dragonbinder && store.init.getters[key]) {
              let value = store.init.getters[key](store.state, store.getters, this.state, this.getters);
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
      Object.defineProperty(this, "rootStore", {
        value: rootStore || null,
        enumerable: true
      });
      Object.defineProperty(this, "namespace", {
        value: namespace || null,
        enumerable: true
      });
      if (modules) {
        Object.keys(modules).forEach((namespace2) => {
          let n = this.namespace ? `${this.namespace}.${namespace2}` : namespace2;
          (this.rootStore || this).registerModule(n, modules[namespace2]);
        });
      }
    }
    Dragonbinder.prototype = Dragonbinder.fn = {
      keyExists(objectname, object, key) {
        if (!object[key]) {
          throw new Error(`The ${objectname} "${key}" does not exists.`);
        }
      },
      isFunction(type, callback) {
        if (typeof callback !== "function") {
          throw new Error(`You need to provide a valid function as ${type}.`);
        }
      },
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
      isUnfrozen() {
        if (this.init.frozen) {
          throw new Error("You need to commit a mutation to change the state");
        }
      },
      commit(mutation, ...args) {
        let { store, key } = this.getStore(this, mutation);
        this.keyExists("mutation", store.init.mutations, key);
        store.init.frozen = false;
        this.trigger("beforecommit", mutation, ...args);
        store.init.mutations[key](store.state, ...args);
        this.trigger("commit", mutation, ...args);
        store.init.frozen = true;
      },
      dispatch(action, ...args) {
        let { store, key } = this.getStore(this, action);
        this.keyExists("action", store.init.actions, key);
        store.init.frozen = false;
        this.trigger("beforedispatch", action, ...args);
        return Promise.resolve(store.init.actions[key](store, ...args)).then((result) => {
          this.trigger("dispatch", action, ...args);
          return result;
        });
      },
      trigger(event, ...args) {
        this.init.listeners[event].forEach((callback) => callback(this, ...args));
      },
      on(event, listener) {
        this.isFunction("listener", listener);
        this.keyExists("event", this.init.listeners, event);
        if (this.init.listeners[event].indexOf(listener) === -1) {
          this.init.listeners[event].push(listener);
          this.trigger("addlistener", event, listener);
        }
        return () => this.off(event, listener);
      },
      off(event, listener) {
        this.isFunction("listener", listener);
        this.keyExists("event", this.init.listeners, event);
        let index = this.init.listeners[event].indexOf(listener);
        if (index > -1) {
          this.init.listeners[event].splice(index, 1);
          this.trigger("removelistener", event, listener);
        }
      },
      use(plugin, ...options) {
        this.isFunction("plugin", plugin);
        if (this.init.plugins.indexOf(plugin) === -1) {
          plugin(this, ...options);
          this.init.plugins.push(plugin);
          this.trigger("plugin", plugin, ...options);
        }
      },
      registerModule(namespace, module2) {
        let rootStore = this;
        if (rootStore.init.modules[namespace]) {
          throw new Error(`A module with the namespace "${namespace}" is already registered.`);
        }
        let newStore = new Dragonbinder(Object.assign({ rootStore, namespace }, module2));
        rootStore.init.frozen = false;
        rootStore.init.modules[namespace] = newStore;
        rootStore.state[namespace] = newStore.state;
        rootStore.init.frozen = true;
        rootStore.trigger("registerModule", namespace, module2, newStore);
      },
      unregisterModule(namespace) {
        let rootStore = this;
        let store = rootStore.init.modules[namespace];
        if (store) {
          store.init.childModuleNamespaces.forEach((n) => rootStore.unregisterModule(`${namespace}.${n}`));
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
  }
});
export default require_lib();
