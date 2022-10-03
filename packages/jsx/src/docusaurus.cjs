/** @type {import('../docusaurus').default} */
module.exports = async function whyframe(_, options) {
  const { WhyframePlugin } = await import('@whyframe/core/webpack')
  return {
    name: 'docusaurus-plugin-whyframe',
    configureWebpack() {
      const { parserOptions, ...pluginOptions } = options

      return {
        mergeStrategy: { plugins: 'prepend' },
        plugins: [
          new WhyframePlugin(pluginOptions),
          new WhyframeDocusaurusPlugin()
        ],
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              exclude: /node_modules/,
              use: [
                {
                  loader: '@whyframe/jsx/loader',
                  options: {
                    defaultFramework: 'react17',
                    parserOptions
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}

class WhyframeDocusaurusPlugin {
  /**
   * @param {import('webpack').Compiler} compiler
   */
  apply(compiler) {
    // copy jsx rule above into mdx. exactly between the babel loader and docusaurus mdx loader
    // so that we can process jsx exactly. mdx -> (whyframe) -> babel.
    const rules = compiler.options.module.rules
    const whyframeJsxRule = rules.find((r) =>
      // @ts-ignore
      r.use?.[0]?.loader?.includes('@whyframe/jsx/loader')
    )
    const docusaurusMdxRule = rules.find(
      (r) =>
        // @ts-ignore
        r.use?.[0]?.loader?.includes('babel-loader') &&
        // @ts-ignore
        r.use?.[1]?.loader?.includes('@docusaurus/mdx-loader')
    )
    if (whyframeJsxRule && docusaurusMdxRule) {
      // @ts-ignore
      docusaurusMdxRule.use.splice(1, 0, whyframeJsxRule.use[0])
    }
  }
}
