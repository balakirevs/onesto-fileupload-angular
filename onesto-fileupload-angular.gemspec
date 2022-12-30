# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'onesto/fileupload/angular/version'

Gem::Specification.new do |spec|
  spec.name          = "onesto-fileupload-angular"
  spec.version       = Onesto::Fileupload::Angular::VERSION
  spec.authors       = ["Sampo Laaksonen"]
  spec.email         = ["sampo.laaksonen@onesto.fi"]
  spec.summary       = %q{Angular components for asynchronous file uploading}
  #spec.description   = %q{TODO: Write a longer description. Optional.}
  spec.homepage      = "http://gems.onesto.fi"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  # Prevent pushing this gem to RubyGems.org by setting 'allowed_push_host', or
  # delete this section to allow pushing this gem to any host.
  if spec.respond_to?(:metadata)
    spec.metadata['allowed_push_host'] = 'https://artifactory.qvantel.net/artifactory/api/gems/gems-local'
  else
    raise "RubyGems 2.0 or newer is required to protect against public gem pushes."
  end

  spec.add_development_dependency "bundler", "~> 1.7"
  spec.add_development_dependency "rake", "~> 10.0"
end
