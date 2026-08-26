#pragma once

#include "RUNEMarkdownTextRunShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

namespace facebook::react {
using RUNEMarkdownTextRunComponentDescriptor = ConcreteComponentDescriptor<RUNEMarkdownTextRunShadowNode>;

void RUNEMarkdownTextRunSpec_registerComponentDescriptorsFromCodegen(
  std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
}
