package runtime_test

import (
	"testing"

	"github.com/khulnasoft/ezburn/internal/compat"
	"github.com/khulnasoft/ezburn/internal/config"
	"github.com/khulnasoft/ezburn/internal/js_parser"
	"github.com/khulnasoft/ezburn/internal/logger"
	"github.com/khulnasoft/ezburn/internal/runtime"
)

func TestUnsupportedFeatures(t *testing.T) {
	for key, feature := range compat.StringToJSFeature {
		t.Run(key, func(t *testing.T) {
			source := runtime.Source(feature)
			log := logger.NewDeferLog(logger.DeferLogAll, nil)

			js_parser.Parse(log, source, js_parser.OptionsFromConfig(&config.Options{
				UnsupportedJSFeatures: feature,
				TreeShaking:           true,
			}))

			if log.HasErrors() {
				msgs := "Internal error: failed to parse runtime:\n"
				for _, msg := range log.Done() {
					msgs += msg.String(logger.OutputOptions{IncludeSource: true}, logger.TerminalInfo{})
				}
				t.Fatal(msgs[:len(msgs)-1])
			}
		})
	}
}
