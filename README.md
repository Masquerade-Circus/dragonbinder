[![npm version](https://img.shields.io/npm/v/dragonbinder.svg?style=flat)](https://npmjs.org/package/dragonbinder "View this project on npm")
![](https://img.shields.io/bundlephobia/min/dragonbinder.svg?style=flat)
![](https://img.shields.io/bundlephobia/minzip/dragonbinder.svg?style=flat)


[![Build Status](https://travis-ci.org/Masquerade-Circus/dragonbinder.svg?branch=master)](https://travis-ci.org/Masquerade-Circus/dragonbinder)
[![Dependencies](https://img.shields.io/david/masquerade-circus/dragonbinder.svg?style=flat)](https://david-dm.org/masquerade-circus/dragonbinder)
![](https://img.shields.io/github/issues/masquerade-circus/dragonbinder.svg)
![](https://img.shields.io/snyk/vulnerabilities/npm/dragonbinder.svg)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/521f72fc6d61426783692b62d64a3643)](https://www.codacy.com/app/Masquerade-Circus/dragonbinder?utm_source=github.com&utm_medium=referral&utm_content=Masquerade-Circus/dragonbinder&utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/c1263dd7fb4f90194625/maintainability)](https://codeclimate.com/github/Masquerade-Circus/dragonbinder/maintainability)
[![Coverage Status](https://coveralls.io/repos/github/Masquerade-Circus/dragonbinder/badge.svg?branch=master)](https://coveralls.io/github/Masquerade-Circus/dragonbinder?branch=master)
[![License](https://img.shields.io/github/license/masquerade-circus/dragonbinder.svg)](https://github.com/masquerade-circus/dragonbinder/blob/master/LICENSE)

# Dragonbinder
A tiny, less than 1kb, framework agnostic, state managment library inspired by Vuex.

## Table of Contents

-   [Install](#install)
-   [Features](#features)
-   [Use](#use)
-   [State](#state)
-   [Getters](#getters)
-   [Mutations](#mutations)
-   [Actions](#actions)
-   [Listeners](#listeners)
-   [Tests](#tests)
-   [Contributing](#contributing)
-   [Legal](#legal)

## Install

You can get this library as a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/):

```bash
// With npm
$ npm install dragonbinder
// With yarn
$ yarn add dragonbinder
```

Or you can use it standalone in the browser with: 
`<script src="https://cdn.jsdelivr.net/npm/dragonbinder"></script>`

## Features 

-   [x] Immutable state.
-   [x] Getters.
-   [x] Mutations.
-   [x] Actions.
-   [x] Listeners.

## Use

```javascript
const createStore = require('dragonbinder');

const store = createStore({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

store.commit('increment');
console.log(store.state.count) // -> 1
```

### State
Dragonbinder use Proxies to create a state as a "single source of truth" which cannot be changed unless you commit a mutation. 
This is, you cannot delete, modify or add a property directly. This allow us to keep track of all changes we made to the state.

If you don't provide an initial state by the state property, Dragonbinder will create one.

```javascript
const store = createStore({
  state: {
    count: 0
  },
  mutations: {
    addProperty(state, value) {
      state.hello = 'world';
    },
    modifyProperty(state) {
      state.count++
    },
    removeProperty(state) {
      delete state.count;
    }
  }
});

// This will throw errors
store.state.hello = 'world';
store.state.count++;
delete state.count;

// This will work as expected
store.commit('addProperty');
store.commit('modifyProperty');
store.commit('removeProperty');
```

### Getters 
As with Vue, with Dragonbinder you can create getters to create computed properties based on the state. 
This getters will receive the state as first argument and all other getters as second.

```javascript
const store = createStore({
  state: {
    todos: [
      {
        content: 'First',
        completed: false
      }, 
      {
        content: 'Second',
        completed: true
      }
    ]
  },
  getters: {
    completed(state){
      return state.todos.filter(item => item.completed);
    },
    completedCount(state, getters){
      return getters.completed.length;
    }
  }
});

console.log(store.getters.completed); // -> { content: 'Second', completed: true }
console.log(store.getters.completedCount); // -> 1
```

### Mutations
Mutations are the only way to change the state and you must consider the next points when designing mutations.

-   Following the Vuex pattern, mutations must be synchronous.
-   Note that with Dragonbinder the state is deep frozen using `Object.freeze` to prevent direct changes. So, when you are changing the state by using a mutation, you can add, modify or delete only fist level properties, second level properties will be read only.
-   Unlike many other libraries you can pass any number of arguments to a mutation.

```javascript
const store = createStore({
  state: {
    hello: {
      name: 'John Doe'
    }
  },
  mutations: {
    changeNameError(state, payload){
      state.hello.name = payload;
    },
    changeNameOk(state, payload){
      state.hello = {...state.hello, name: payload};
    },
    changeNameTo(state, ...args){
      state.hello = {...state.hello, name: args.join(' ')};
    }
  }
});

// This will throw an assign to read only property error
store.commit('changeNameError', 'Jane Doe');

// This will work as expected
store.commit('changeNameOk', 'Jane Doe');

// You can pass any number of arguments as payload
store.commit('changeNameTo', 'Jane', 'Doe');
```
### Actions
If you need to handle async functions you must use actions. And actions will always return a promise as result of calling them. 
```javascript 
const store = createStore({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    increment(state){
      return new Promise((resolve) => {
        setTimeout(() => {
          store.commit('increment');
          resolve();
        }, 1000);
      })
    }
  }
});

store.dispatch('increment').then(() => console.log(store.state.count)); // -> 1 after one second
```

### Listeners
You can register/unregister callbacks to listen for changes. 
The callback will receive the state as the first argument, the property that was changed as second, the new value as third and the old value as the last argument.

```javascript 
const store = createStore({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

// Subscribe a named method
let namedListener = (state, prop, newVal, oldVal) => console.log(`The property ${prop} was changed from ${oldVal} to ${newVal}`);
store.subscribe(namedListener);

// Subscribe an anonymous method
let unsubscribeAnon = store.subscribe(() => console.log('Anonymous method triggered'));

// Committing increment will trigger the listeners
store.commit('increment'); 
// $ The property count was changed from 0 to 1
// $ Anonymous method triggered

// Unsubscribe a named method 
store.unsubscribe(namedListener);

// Unsubscribe an anonyous method 
unsubscribeAnon();

// Committing increment will do nothing as the listeners are already unsubscribed
store.commit('increment'); 

```

## Development, Build and Tests 

Use `yarn dev` to watch and compile the library on every change to it. 

Use `yarn build` to build the library. 

Use `yarn test` to run tests only once.

Use `yarn dev:test` to run the tests watching changes to library and tests.

Use `yarn dev:test:nyc` to run the tests watching changes and get the test coverage at last.

## Contributing

-   Use prettify and eslint to lint your code.
-   Add tests for any new or changed functionality.
-   Update the readme with an example if you add or change any functionality.

## Legal

Author: [Masquerade Circus](http://masquerade-circus.net). License [Apache-2.0](https://opensource.org/licenses/Apache-2.0)