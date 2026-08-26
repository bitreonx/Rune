#import "RuneMarkdownTextRun.h"
#import "RuneMarkdownText.h"
#import "RuneMarkdownTextRunComponentDescriptor.h"
#import <react/renderer/components/RuneMarkdownTextSpec/EventEmitters.h>
#import <react/renderer/components/RuneMarkdownTextSpec/Props.h>
#import <react/renderer/components/RuneMarkdownTextSpec/RCTComponentViewHelpers.h>
#import "RCTFabricComponentsPlugins.h"
#import "Utils.h"

using namespace facebook::react;

@interface RuneMarkdownTextRun () <RCTRuneMarkdownTextRunViewProtocol>

@end

@implementation RuneMarkdownTextRun {
  NSString * _text;
  RCTBubblingEventBlock _onPress;
  RCTBubblingEventBlock _onLongPress;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<RuneMarkdownTextRunComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RuneMarkdownTextRunProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<RuneMarkdownTextRunProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<RuneMarkdownTextRunProps const>(props);

  if (newViewProps.text != oldViewProps.text) {
    NSString *text = [NSString stringWithUTF8String:newViewProps.text.c_str()];
    _text = text;
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)onPress {
  if (_eventEmitter != nullptr) {
    std::dynamic_pointer_cast<const facebook::react::RuneMarkdownTextRunEventEmitter>(_eventEmitter)
    ->onPress(facebook::react::RuneMarkdownTextRunEventEmitter::OnPress{});
  }
}

- (void)onLongPress {
  if (_eventEmitter != nullptr) {
    std::dynamic_pointer_cast<const facebook::react::RuneMarkdownTextRunEventEmitter>(_eventEmitter)
    ->onLongPress(facebook::react::RuneMarkdownTextRunEventEmitter::OnLongPress{});
  }
}

+ (BOOL)shouldBeRecycled {
  return NO;
}

Class<RCTComponentViewProtocol> RuneMarkdownTextRunCls(void)
{
    return RuneMarkdownTextRun.class;
}

@end
