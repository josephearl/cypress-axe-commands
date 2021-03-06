const fs = require('fs')

const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8')

export const injectAxe = () => {
  cy.window({ log: false }).then(window => {
    window.eval(axe)
  })
}

export const configureAxe = (configurationOptions = {}) => {
  cy.window({ log: false }).then(win => {
    return win.axe.configure(configurationOptions)
  })
}

const checkA11y = (
  context,
  options,
  violationCallback,
  skipFailures = false
) => {
  cy.window({ log: false })
    .then(win => {
      if (isEmptyObjectorNull(context)) context = undefined
      if (isEmptyObjectorNull(options)) options = undefined
      if (isEmptyObjectorNull(violationCallback)) violationCallback = undefined
      const { includedImpacts, ...axeOptions } = options || {}
      return win.axe
        .run(context || win.document, axeOptions)
        .then(({ violations }) => {
          return includedImpacts &&
            Array.isArray(includedImpacts) &&
            Boolean(includedImpacts.length)
            ? violations.filter(v => includedImpacts.includes(v.impact))
            : violations
        })
    })
    .then(violations => {
      if (violationCallback) {
        violationCallback(violations)
      }
      if (violations.length) {
        cy.wrap(violations, { log: false }).each(v => {
          const selectors = v.nodes
            .reduce((acc, node) => acc.concat(node.target), [])
            .join(', ')

          Cypress.log({
            $el: Cypress.$(selectors),
            name: 'a11y error!',
            consoleProps: () => v,
            message: `${v.id} on ${v.nodes.length} Node${
              v.nodes.length === 1 ? '' : 's'
            }`
          })
        })
      }

      return cy.wrap(violations, { log: false })
    })
    .then(violations => {
      const summaryMessage = `${violations.length} accessibility violation${
        violations.length === 1 ? '' : 's'
      } ${violations.length === 1 ? 'was' : 'were'} detected`
      const voilationsMessage = violations.map((v, index) => {
        const selectors = v.nodes
            .reduce((acc, node) => acc.concat(node.target), [])
            .join(', ')
        return `${index+1}) ${v.id} on ${v.nodes.length} Node${
          v.nodes.length === 1 ? '' : 's'
        }: ${selectors}`
      }).join(', ')
      const errorMessage = `${summaryMessage} ${voilationsMessage}`

      if (!skipFailures) {
        assert.equal(
          violations.length,
          0,
          errorMessage
        )
      } else {
        if (violations.length) {
          Cypress.log({
            name: 'a11y violation summary',
            message: errorMessage
          })
        }
      }
    })
}

Cypress.Commands.add('injectAxe', injectAxe)

Cypress.Commands.add('configureAxe', configureAxe)

Cypress.Commands.add('checkA11y', checkA11y)

function isEmptyObjectorNull(value) {
  if (value == null) return true
  return Object.entries(value).length === 0 && value.constructor === Object
}
