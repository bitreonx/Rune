#pragma once

#include "RuneMarkdownTextRunShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

namespace facebook::react {
using RuneMarkdownTextRunComponentDescriptor = ConcreteComponentDescriptor<RuneMarkdownTextRunShadowNode>;

void RuneMarkdownTextRunSpec_registerComponentDescriptorsFromCodegen(
  std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
}
