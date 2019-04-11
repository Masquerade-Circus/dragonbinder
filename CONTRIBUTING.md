# Contributing Guide

## Table of Contents

-   [Contributing Guide](#contributing-guide)
    -   [Table of Contents](#table-of-contents)
    -   [Ways to contribute](#ways-to-contribute)
        -   [Call for contributors](#call-for-contributors)
        -   [Submit Feedback](#submit-feedback)
        -   [Fix Bugs](#fix-bugs)
        -   [Implement Features](#implement-features)
        -   [Write Documentation](#write-documentation)
        -   [Develop a plugin](#develop-a-plugin)
    -   [Pull Request Guide](#pull-request-guide)
    -   [Code Style Guide](#code-style-guide)
    -   [Documentation Guide](#documentation-guide)
    -   [Testing Guide](#testing-guide)
    -   [Attribution](#attribution)

## Ways to contribute

### Call for contributors

You can follow the tag of `call for contributors` in the issues. The pull requests solving these issues are most likely to be merged.

### Submit Feedback

The feedback should be submitted by creating an issue at GitHub issues. Select the related template and add the corresponding labels.

### Fix Bugs

You may look through the GitHub issues for bugs. Anything tagged with `bug report` is open to whoever wants to implement it.

### Implement Features

You may look through the GitHub issues for feature requests. Anything tagged with `feature request` is open to whoever wants to implement it.

### Write Documentation

The documentation is either directly written into the Markdown files, or automatically extracted from the `jsdoc comments` by executing the `yarn docs` script, this will make use of [docma](https://onury.io/docma/) to generate the documentation.

In the first situation, you only need to change the markdown file and if its a new file, add it to the `docma.json` configuration. 

In the second situation, you need to change the `jsdoc comments` of the file that needs the documentation.

### Develop a plugin

You may develop a plugin creating your own repo. Just give your plugin a meaningful unique name, make sure the name follows the convention dragonbinder-plugin-{name} and, when finished, you can make a [pull request](#pull-request-guide) updating the documentation with your plugin listed in the Plugin system section. 

## Pull Request Guide

Before you submit a pull request, check that it meets these guidelines. Please also read [Code Style Guide](#code-style-guide), [Documentation Guide](#documentation-guide) and [Testing Guide](#testing-guide) to ensure your merge request meet our requirements.

-   Fork the repository. Create a new branch from the master branch. Give your new branch a meaningful name.
-   Create a [draft pull request](https://help.github.com/en/articles/about-pull-requests#draft-pull-requests) from your new branch to the master branch of the original repo. Give your pull request a meaningful name.
-   Include `resolves #issue_number` in the description of the pull request if needed and briefly describe your contribution.
-   Submit the pull request from the first day of your development (after your first commit).
-   When the contribution is complete, make sure the pull request passed the CI tests. Change the draft pull request status to ready for review. Set the reviewer to [@masquerade-circus](https://github.com/Masquerade-Circus).
-   For the case of bug fixes, add new test cases which would fail before your bug fix.

## Code Style Guide

This project use [eslint](https://eslint.org/) with [sonarjs eslint plugin](https://github.com/SonarSource/eslint-plugin-sonarjs) and [prettier](https://prettier.io/) to format the code. Make sure you have configured your editor to format the files using this rules on save. Consider that `jsdoc comments` are not mandatory, but we need them to build a trustworthy documentation.

## Documentation Guide

The documentation should be provided in two ways, `jsdoc comments` and updating the readme file. We prefer the documentation to be as complete as possible.

You only need to add tutorials to your code if you are contributing or updating a new feature.

If you are updating via jsdoc comments or updating the readme file, you can make use of the `yarn docs:watch` script to watch for changes to the lib and the readme file. This script will rebuild the documentation on every change. 

To see the documentation locally, you can make use of the `yarn docs:serve`, this will serve the documentation at <http://localhost:9000>.

Finally, before commit make use of [remark](https://www.npmjs.com/package/remark) to format any updated markdown file. After format the updated files, build the documentation one last time using the `yarn docs` script. 

## Testing Guide

We make use of [AVA](https://github.com/avajs/ava) to write tests. You should test your code by writing unit testing code in tests directory. The testing file name should be a {feature}\_test.js file in the corresponding directory. The suffix \_test is mandatory. 

You can make use of the `yarn dev:test:nyc` script to watch for changes and run the tests on every change. It would output the coverage information to the console and into a directory named coverage. Please make sure the code coverage percentage does not decrease after your contribution, otherwise, the code will not be merged.

## Attribution

This contribution guide is adapted partially from the [Auto-Keras contributing guide](https://autokeras.com/temp/contribute/).
