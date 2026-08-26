#import "RUNEMarkdownTextRun.h"
#import "RUNEMarkdownText.h"
#import "RUNEMarkdownTextRunComponentDescriptor.h"
#import <react/renderer/components/RUNEMarkdownTextSpec/EventEmitters.h>
#import <react/renderer/components/RUNEMarkdownTextSpec/Props.h>
#import <react/renderer/components/RUNEMarkdownTextSpec/RCTComponentViewHelpers.h>
#import "RCTFabricComponentsPlugins.h"
#import "Utils.h"

using namespace facebook::react;

@interface RUNEMarkdownTextRun () <RCTRUNEMarkdownTextRunViewProtocol>

@end

@implementation RUNEMarkdownTextRun {
  NSString * _text;
  RCTBubblingEventBlock _onPress;
  RCTBubblingEventBlock _onLongPress;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<RUNEMarkdownTextRunComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RUNEMarkdownTextRunProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<RUNEMarkdownTextRunProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<RUNEMarkdownTextRunProps const>(props);

  if (newViewProps.text != oldViewProps.text) {
    NSString *text = [NSString stringWithUTF8String:newViewProps.text.c_str()];
    _text = text;
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)onPress {
  if (_eventEmitter != nullptr) {
    std::dynamic_pointer_cast<const facebook::react::RUNEMarkdownTextRunEventEmitter>(_eventEmitter)
    ->onPress(facebook::react::RUNEMarkdownTextRunEventEmitter::OnPress{});
  }
}

- (void)onLongPress {
  if (_eventEmitter != nullptr) {
    std::dynamic_pointer_cast<const facebook::react::RUNEMarkdownTextRunEventEmitter>(_eventEmitter)
    ->onLongPress(facebook::react::RUNEMarkdownTextRunEventEmitter::OnLongPress{});
  }
}

+ (BOOL)shouldBeRecycled {
  return NO;
}

Class<RCTComponentViewProtocol> RUNEMarkdownTextRunCls(void)
{
    return RUNEMarkdownTextRun.class;
}

@end
